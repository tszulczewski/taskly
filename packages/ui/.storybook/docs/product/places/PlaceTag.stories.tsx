import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { PlaceTag, placeColors, defaultPlaceText } from "../../../../src";
import { withDocFrame } from "../../../blocks/DocFrame";
import { DoDont, Narrow, Stack, StateRow } from "../../../blocks/Primitives";
import { bathroom, kitchen, longPlace, polishPlaces, somePlaces } from "../../../blocks/place-data";

const meta = {
  title: "Product/Places/Place tag",
  component: PlaceTag,
  decorators: [withDocFrame],
  args: { place: bathroom },
  argTypes: { place: { control: "object" } },
} satisfies Meta<typeof PlaceTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    // The dot is decoration; the name is what is read out (WCAG 1.4.1).
    const tag = within(canvasElement).getByText("Bathroom");
    await expect(tag.querySelector("[aria-hidden='true']")).toHaveClass("bg-place-1");
  },
};

/** All ten colours with their words (Luki 3); names here are the colour names. */
export const Colours: Story = {
  render: () => (
    <div className="flex flex-wrap gap-x-group gap-y-inline">
      {placeColors.map((color) => (
        <PlaceTag key={color} place={{ name: defaultPlaceText.colorNames[color], color }} />
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <Stack>
      <StateRow
        title="Place tag"
        cells={[
          { state: "One place", node: <PlaceTag place={kitchen} /> },
          {
            state: "Several in the meta line",
            node: (
              <span className="flex flex-wrap items-center gap-x-group text-meta text-muted">
                {somePlaces.map((place) => (
                  <PlaceTag key={place.id} place={place} />
                ))}
              </span>
            ),
          },
          { state: "Longest name (30 characters)", node: <PlaceTag place={longPlace} /> },
        ]}
      />
    </Stack>
  ),
};

export const Narrow320: Story = {
  globals: { viewport: { value: "phone320", isRotated: false } },
  render: () => (
    <Narrow>
      <span className="flex flex-wrap items-center gap-x-group text-meta text-muted">
        {[...somePlaces, longPlace].map((place) => (
          <PlaceTag key={place.id} place={place} />
        ))}
      </span>
    </Narrow>
  ),
};

export const Polish: Story = {
  render: () => (
    <span className="flex flex-wrap items-center gap-x-group text-meta text-muted">
      {polishPlaces.map((place) => (
        <PlaceTag key={place.id} place={place} />
      ))}
    </span>
  ),
};

export const DoAndDont: Story = {
  render: () => (
    <DoDont
      good={{
        node: (
          <span className="flex items-center gap-x-group text-meta text-muted">
            <PlaceTag place={bathroom} />
            <PlaceTag place={kitchen} />
          </span>
        ),
        why: "The name says the place; the dot only helps the eye find it again.",
      }}
      bad={{
        node: (
          <span className="flex items-center gap-inline">
            <span aria-hidden="true" className="size-dot rounded-full bg-place-1" />
            <span aria-hidden="true" className="size-dot rounded-full bg-place-2" />
          </span>
        ),
        why: "Dots alone carry the meaning by colour only (WCAG 1.4.1, Luki 3).",
      }}
    />
  ),
};
