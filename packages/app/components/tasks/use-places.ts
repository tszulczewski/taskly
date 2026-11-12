"use client";

import {
  deletePlaceResponseSchema,
  type PlaceView,
  placeViewSchema,
  type TaskView,
} from "@taskly/core";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { isNotFound, withPlaceDeleted, withPlaceUpdated } from "./task-items";
import { writeTasks } from "./use-tasks";

const placePath = (placeId: string) => `/api/places/${encodeURIComponent(placeId)}`;

const writePlaces = (queryClient: QueryClient, update: (places: PlaceView[]) => PlaceView[]) =>
  queryClient.setQueryData<PlaceView[]>(queryKeys.places(), (places) => places && update(places));

/**
 * Creates a place (`POST /api/places`) and adds it to the places cache; the screen then ticks it
 * through the list queue (create and tick, spec E02). Not optimistic: the form waits.
 */
export function useCreatePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiCall("/api/places", { method: "POST", body: { name }, response: placeViewSchema }),
    onSuccess: (place) => writePlaces(queryClient, (places) => [...places, place]),
  });
}

export interface UpdatePlaceVariables {
  placeId: string;
  name: string;
  color: number;
}

/**
 * Renames or recolours a place, then patches the places cache and the cached task views of the
 * list with the server's place (AC6). The tasks are not refetched: that would bypass the "skip
 * while other task mutations are pending" rule and drop quick adds still saving (P2).
 */
export function useUpdatePlace(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ placeId, name, color }: UpdatePlaceVariables) =>
      apiCall(placePath(placeId), {
        method: "PATCH",
        body: { name, color },
        response: placeViewSchema,
      }),
    // Gone meanwhile (another tab deleted it): the refetch takes it out of the picker.
    onError: (error) => {
      if (isNotFound(error)) void queryClient.invalidateQueries({ queryKey: queryKeys.places() });
    },
    onSuccess: async (place) => {
      writePlaces(queryClient, (places) =>
        places.map((own) => (own.id === place.id ? place : own)),
      );
      await writeTasks(queryClient, listId, (tasks: TaskView[]) => withPlaceUpdated(tasks, place));
    },
  });
}

/**
 * Deletes a place everywhere (AC7), then drops it from the places cache and from every cached task
 * view of the list, without a refetch (P2). A tick of it still queued is skipped by the replay and
 * answers 404 (P9).
 */
export function useDeletePlace(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // Already gone (another tab deleted it) is the outcome asked for.
    mutationFn: (placeId: string) =>
      apiCall(placePath(placeId), { method: "DELETE", response: deletePlaceResponseSchema }).catch(
        (error: unknown) => {
          if (isNotFound(error)) return null;
          throw error;
        },
      ),
    onSuccess: async (_none, placeId) => {
      writePlaces(queryClient, (places) => places.filter((own) => own.id !== placeId));
      await writeTasks(queryClient, listId, (tasks: TaskView[]) =>
        withPlaceDeleted(tasks, placeId),
      );
    },
  });
}
