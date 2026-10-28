import { Ellipsis, Moon, Sun } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Alert,
  AppHeader,
  AuthCard,
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
  CompleteTaskDialog,
  ConfirmDialog,
  DeleteTaskDialog,
  EmptyState,
  ErrorState,
  EstimateRange,
  FormField,
  FutureExpenses,
  Input,
  Label,
  Link,
  Markers,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  PasswordInput,
  PlaceColorPicker,
  PlaceTag,
  Popover,
  PopoverContent,
  PopoverTrigger,
  QuickAdd,
  RadioGroup,
  RadioGroupSegment,
  SignInForm,
  SignUpClosed,
  SignUpForm,
  Skeleton,
  SubtaskProgress,
  Surface,
  TaskCheckbox,
  TaskForm,
  TaskList,
  TaskRow,
  TextAction,
  Textarea,
  ThemeToggle,
  Tooltip,
  UnestimatedTasks,
  type PlaceColor,
  type TaskItem,
  type Theme,
} from "../../src";
import { DocFrame } from "./DocFrame";
import { OrderDemo } from "./OrderDemo";
import { PlacePickerDemo } from "./PlacePickerDemo";
import { catalog, docsId, type CatalogGroup } from "./catalog";
import { answer, validateSignIn, validateSignUp } from "./fake-api";
import { bathroom, hall, kitchen, somePlaces } from "./place-data";
import {
  curtainRods,
  futureExpenses,
  paintCeiling,
  progressTasks,
  sealBath,
  someTasks,
  validateEstimate,
  validateTask,
} from "./task-data";

const ok = answer({ ok: true });
const nothing = () => {};

function ThemeTogglePreview() {
  const [theme, setTheme] = useState<Theme>("dark");
  return <ThemeToggle value={theme} onValueChange={setTheme} />;
}

function AppHeaderPreview() {
  const [theme, setTheme] = useState<Theme>("dark");
  // The header is laid out for the page width (288px of content at 320px); the catalog column is
  // narrower on a phone, so the preview scrolls on its own instead of widening the docs page.
  return (
    <div role="group" aria-label="App shell preview" tabIndex={0} className="overflow-x-auto">
      <AppHeader theme={theme} onThemeChange={setTheme} onSignOut={async () => true} />
    </div>
  );
}

function TaskCheckboxPreview() {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-group">
      <TaskCheckbox label="Complete “Seal the bath”" completed={done} onCompletedChange={setDone} />
      <span className={done ? "font-strong text-muted line-through" : "font-strong"}>
        Seal the bath
      </span>
    </div>
  );
}

/** A dialog preview opens from a button, so the catalog page itself stays usable. */
function DialogPreview({
  label,
  dialog,
}: {
  label: string;
  dialog: (task: TaskItem | null, close: () => void) => ReactNode;
}) {
  const [task, setTask] = useState<TaskItem | null>(null);
  return (
    <>
      <Button onClick={() => setTask(paintCeiling)}>{label}</Button>
      {dialog(task, () => setTask(null))}
    </>
  );
}

function PlaceColorPreview() {
  const [color, setColor] = useState<PlaceColor>(7);
  return (
    <PlaceColorPicker value={color} onValueChange={setColor} places={somePlaces} label="Colour" />
  );
}

const progress = futureExpenses(progressTasks);

const previews: Record<string, ReactNode> = {
  Button: (
    <div className="flex flex-wrap gap-group">
      <Button variant="primary">Add</Button>
      <Button>Cancel</Button>
    </div>
  ),
  "Text action and link": (
    <div className="flex flex-wrap gap-x-between-groups">
      <TextAction>Add estimate</TextAction>
      <Link href="#catalog">Create an account</Link>
    </div>
  ),
  Input: <FormField label="Title">{(field) => <Input {...field} />}</FormField>,
  "Password input": (
    <FormField label="Password">{(field) => <PasswordInput {...field} />}</FormField>
  ),
  Textarea: <FormField label="Description">{(field) => <Textarea {...field} />}</FormField>,
  "Form field": (
    <FormField label="up to" error="“Up to” must not be less than the amount.">
      {(field) => <Input {...field} defaultValue="100" inputMode="decimal" suffix="zł" />}
    </FormField>
  ),
  Checkbox: (
    <div className="flex items-center">
      <Checkbox id="catalog-bathroom" defaultChecked />
      <Label htmlFor="catalog-bathroom">Bathroom</Label>
    </div>
  ),
  "Radio group": (
    <RadioGroup aria-label="Theme" variant="segmented" defaultValue="dark">
      <RadioGroupSegment value="dark">
        <Moon aria-hidden="true" />
        Dark
      </RadioGroupSegment>
      <RadioGroupSegment value="light">
        <Sun aria-hidden="true" />
        Light
      </RadioGroupSegment>
    </RadioGroup>
  ),
  Surface: (
    <Surface padding="inset">
      <p>One calm panel; rows inside are divided by a line.</p>
    </Surface>
  ),
  Alert: <Alert title="Could not sign out. Try again." />,
  Skeleton: (
    <div className="flex flex-col gap-inline">
      <Skeleton className="w-2/3" />
      <Skeleton className="w-1/3" />
    </div>
  ),
  Collapsible: (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <TextAction tone="muted">
          <CollapsibleIndicator />
          Description
        </TextAction>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="pt-inline">Two coats of white matt.</p>
      </CollapsibleContent>
    </Collapsible>
  ),
  "Confirm dialog": (
    <ConfirmDialog
      trigger={<Button variant="danger">Delete task</Button>}
      title="Delete “Seal the bath”?"
      description="This cannot be undone."
      confirmLabel="Delete task"
      onConfirm={nothing}
    />
  ),
  Menu: (
    <Menu modal={false}>
      <MenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="More actions for “Seal the bath”">
          <Ellipsis aria-hidden="true" />
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem>Edit</MenuItem>
        <MenuItem tone="danger">Delete</MenuItem>
      </MenuContent>
    </Menu>
  ),
  Popover: (
    <Popover>
      <PopoverTrigger asChild>
        <TextAction>Places</TextAction>
      </PopoverTrigger>
      <PopoverContent aria-label="Places for “Seal the bath”">
        <p>Bathroom, Hall</p>
      </PopoverContent>
    </Popover>
  ),
  Tooltip: (
    <Tooltip>
      <Button variant="ghost" size="icon" aria-label="More actions">
        <Ellipsis aria-hidden="true" />
      </Button>
    </Tooltip>
  ),
  "Empty state": <EmptyState title="No tasks yet.">Add the first thing you need to do.</EmptyState>,
  "Error state": <ErrorState title="Could not load your tasks." onRetry={nothing} />,
  "App shell": <AppHeaderPreview />,
  "Theme toggle": <ThemeTogglePreview />,
  "Auth card": (
    <AuthCard title="Sign in">
      <p className="text-muted">The form goes here.</p>
    </AuthCard>
  ),
  "Sign-in form": <SignInForm validate={validateSignIn} onSubmit={ok} signUpHref="#catalog" />,
  "Sign-up form": <SignUpForm validate={validateSignUp} onSubmit={ok} signInHref="#catalog" />,
  "Sign-up closed": <SignUpClosed signInHref="#catalog" />,
  "Quick add": <QuickAdd validate={validateTask} onSubmit={ok} />,
  "Task list": (
    <TaskList
      status="ready"
      tasks={someTasks.slice(1, 3)}
      validate={validateTask}
      onRetry={nothing}
      onEdit={ok}
      onAddSubtask={ok}
      onDelete={async () => true}
    />
  ),
  "Task row": (
    <Surface asChild>
      <ul aria-label="Tasks">
        <TaskRow
          task={paintCeiling}
          validate={validateTask}
          onEdit={ok}
          onAddSubtask={ok}
          onRequestDelete={nothing}
        />
      </ul>
    </Surface>
  ),
  "Task form": (
    <TaskForm
      initialValues={{ title: curtainRods.title, amount: "180", upTo: "250", description: "" }}
      validate={validateTask}
      onSubmit={ok}
      onCancel={nothing}
      autoFocus={false}
    />
  ),
  "Estimate range": <EstimateRange value={paintCeiling.estimate} />,
  "Delete task dialog": (
    <DialogPreview
      label="Delete…"
      dialog={(task, close) => (
        <DeleteTaskDialog task={task} onConfirm={async () => true} onClose={close} />
      )}
    />
  ),
  "Drag handle": <OrderDemo initialTasks={[sealBath, curtainRods]} />,
  Markers: (
    <span className="flex flex-wrap items-center gap-x-group text-meta text-muted">
      <Markers important urgent />
    </span>
  ),
  "Task checkbox": <TaskCheckboxPreview />,
  "Subtask progress": (
    <span className="text-meta text-muted">
      <SubtaskProgress done={1} total={3} />
    </span>
  ),
  "Complete task dialog": (
    <DialogPreview
      label="Complete…"
      dialog={(task, close) => (
        <CompleteTaskDialog task={task} openSubtasks={2} onConfirm={close} onCancel={close} />
      )}
    />
  ),
  "Place tag": (
    <span className="flex flex-wrap items-center gap-x-group text-meta text-muted">
      <PlaceTag place={bathroom} />
      <PlaceTag place={kitchen} />
      <PlaceTag place={hall} />
    </span>
  ),
  "Place picker": <PlacePickerDemo initialPlaces={somePlaces} initialSelected={["bathroom"]} />,
  "Place color picker": <PlaceColorPreview />,
  "Future expenses": (
    <FutureExpenses
      status="ready"
      total={progress.total}
      unestimated={progress.unestimated}
      validate={validateEstimate}
      onAddEstimate={ok}
      onRetry={nothing}
    />
  ),
  "Unestimated tasks": (
    <UnestimatedTasks tasks={progress.unestimated} validate={validateEstimate} onAddEstimate={ok} />
  ),
};

/**
 * One group of the Components page: a row per component on one surface, with a small working
 * preview, one sentence and a link to its page (the same list pattern the product uses).
 */
export function CatalogGroupList({ group }: { group: CatalogGroup }) {
  const entries = catalog.filter((entry) => entry.group === group);
  return (
    <DocFrame>
      <Surface asChild>
        <ul aria-label={group}>
          {entries.map((entry) => (
            <li
              key={entry.name}
              className="flex flex-col gap-between-groups border-t border-divider p-inset first:border-t-0 wide:flex-row"
            >
              <div className="flex min-w-0 flex-col gap-inline wide:w-1/3">
                <p className="font-strong">{entry.name}</p>
                <p className="text-meta text-muted">
                  {entry.group} · <code>{entry.imports.join(", ")}</code>
                </p>
                <p>{entry.summary}</p>
                <Link href={`./?path=/docs/${docsId(entry.title)}`} target="_top">
                  {entry.name} docs
                </Link>
              </div>
              <div className="min-w-0 flex-1">{previews[entry.name]}</div>
            </li>
          ))}
        </ul>
      </Surface>
    </DocFrame>
  );
}

/** Names of components without a preview; the Components page test expects none. */
export const missingPreviews = catalog
  .map((entry) => entry.name)
  .filter((name) => !(name in previews));
