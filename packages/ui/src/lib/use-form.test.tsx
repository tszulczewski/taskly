// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Activity, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useForm, type FieldErrors, type SubmitResult } from "./use-form";

afterEach(cleanup);

type Field = "title" | "amount" | "hidden";

const validate = (values: Record<Field, string>): FieldErrors<Field> => ({
  title: values.title ? undefined : "Enter a title",
  amount: /^\d*$/.test(values.amount) ? undefined : "Enter an amount like 1 500",
});

function TestForm({
  onSubmit,
  resetOnSuccess,
}: {
  onSubmit: (values: Record<Field, string>) => Promise<SubmitResult<Field>>;
  resetOnSuccess?: boolean;
}) {
  const form = useForm<Field>({
    initialValues: { title: "", amount: "", hidden: "" },
    validate,
    onSubmit,
    unexpectedError: "Something went wrong. Try again.",
    resetOnSuccess,
  });
  return (
    <form {...form.formProps}>
      {form.formError ? <p role="alert">{form.formError}</p> : null}
      <input aria-label="Title" {...form.field("title")} />
      <p>{form.errors.title}</p>
      <input aria-label="Amount" {...form.field("amount")} />
      <p>{form.errors.amount}</p>
      <p>{form.errors.hidden}</p>
      <button type="submit" aria-disabled={form.pending}>
        Add
      </button>
    </form>
  );
}

const title = () => screen.getByRole("textbox", { name: "Title" });
const amount = () => screen.getByRole("textbox", { name: "Amount" });
const submit = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByRole("button", { name: "Add" }));
  });
};

/** A page that Cache Components hide on navigation (React Activity) and later show again. */
const page = (visible: boolean, form: ReactNode) => (
  <Activity mode={visible ? "visible" : "hidden"}>{form}</Activity>
);

describe("useForm", () => {
  it("validates a field on blur only after the user typed in it", () => {
    render(<TestForm onSubmit={vi.fn()} />);
    fireEvent.blur(title());
    expect(screen.queryByText("Enter a title")).toBeNull();
    fireEvent.change(amount(), { target: { value: "12a" } });
    fireEvent.blur(amount());
    expect(screen.getByText("Enter an amount like 1 500")).toBeTruthy();
    fireEvent.change(amount(), { target: { value: "12" } });
    expect(screen.queryByText("Enter an amount like 1 500")).toBeNull();
  });

  it("focuses the first invalid field on submit and keeps the values", async () => {
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);
    fireEvent.change(amount(), { target: { value: "abc" } });
    await submit();
    expect(screen.getByText("Enter a title")).toBeTruthy();
    expect(document.activeElement).toBe(title());
    expect(amount()).toHaveProperty("value", "abc");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends once and stays busy after the server confirms", async () => {
    let resolve: (result: SubmitResult<Field>) => void = () => {};
    const onSubmit = vi.fn(() => new Promise<SubmitResult<Field>>((r) => (resolve = r)));
    render(<TestForm onSubmit={onSubmit} />);
    fireEvent.change(title(), { target: { value: "Paint the ceiling" } });
    await submit();
    await submit();
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe("true");
    await act(async () => resolve({ ok: true }));
    expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe("true");
  });

  it("comes back idle and empty when its page is shown again after a confirmed submit", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    const { rerender } = render(page(true, <TestForm onSubmit={onSubmit} />));
    fireEvent.change(title(), { target: { value: "Tiles" } });
    await submit();
    rerender(page(false, <TestForm onSubmit={onSubmit} />));
    rerender(page(true, <TestForm onSubmit={onSubmit} />));
    expect((title() as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe("false");
    fireEvent.blur(title());
    expect(screen.queryByText("Enter a title")).toBeNull();
  });

  it("keeps an unsent draft when its page is hidden and shown again", () => {
    const { rerender } = render(page(true, <TestForm onSubmit={vi.fn()} />));
    fireEvent.change(title(), { target: { value: "Tiles" } });
    rerender(page(false, <TestForm onSubmit={vi.fn()} />));
    rerender(page(true, <TestForm onSubmit={vi.fn()} />));
    expect((title() as HTMLInputElement).value).toBe("Tiles");
  });

  it("shows server field errors and focuses the first one", async () => {
    render(
      <TestForm
        onSubmit={async () => ({ ok: false, fieldErrors: { amount: "Min must not exceed max" } })}
      />,
    );
    fireEvent.change(title(), { target: { value: "Tiles" } });
    await submit();
    expect(screen.getByText("Min must not exceed max")).toBeTruthy();
    expect(document.activeElement).toBe(amount());
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe("false");
  });

  it("shows a server error above the form", async () => {
    render(<TestForm onSubmit={async () => ({ ok: false, formError: "Too many attempts." })} />);
    fireEvent.change(title(), { target: { value: "Tiles" } });
    await submit();
    expect(screen.getByRole("alert").textContent).toBe("Too many attempts.");
  });

  it("treats a thrown request as an unexpected error", async () => {
    render(<TestForm onSubmit={() => Promise.reject(new TypeError("Failed to fetch"))} />);
    fireEvent.change(title(), { target: { value: "Tiles" } });
    await submit();
    expect(screen.getByRole("alert").textContent).toBe("Something went wrong. Try again.");
  });

  it("does not move focus for an error on a field that is not on screen", async () => {
    render(<TestForm onSubmit={async () => ({ ok: false, fieldErrors: { hidden: "Gone" } })} />);
    fireEvent.change(title(), { target: { value: "Tiles" } });
    title().focus();
    await submit();
    expect(screen.getByText("Gone")).toBeTruthy();
    expect(document.activeElement).toBe(title());
  });

  it("clears the form and focuses the first field after a confirmed quick add", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true as const }));
    render(<TestForm onSubmit={onSubmit} resetOnSuccess />);
    fireEvent.change(title(), { target: { value: "Tiles" } });
    fireEvent.change(amount(), { target: { value: "15" } });
    amount().focus();
    await submit();
    expect(onSubmit).toHaveBeenCalledWith({ title: "Tiles", amount: "15", hidden: "" });
    expect((title() as HTMLInputElement).value).toBe("");
    expect((amount() as HTMLInputElement).value).toBe("");
    expect(document.activeElement).toBe(title());
    expect(screen.getByRole("button", { name: "Add" }).getAttribute("aria-disabled")).toBe("false");
    fireEvent.blur(title());
    expect(screen.queryByText("Enter a title")).toBeNull();
  });
});
