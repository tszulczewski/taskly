export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-page">
      <main className="flex flex-1 w-full max-w-content flex-col items-center justify-between py-page-top px-page-gutter wide:items-start">
        <div className="flex flex-col items-center gap-between-groups text-center wide:items-start wide:text-left">
          <h1 className="max-w-measure text-heading font-strong text-primary">
            To get started, edit the{" "}
            <code className="rounded-control bg-raised px-inline">page.tsx</code> file.
          </h1>
          <p className="max-w-measure text-body text-muted">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-strong text-primary"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-strong text-primary"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-group text-body font-strong wide:flex-row">
          <a
            className="flex min-h-touch w-full items-center justify-center gap-inline rounded-control bg-action px-inset text-on-action transition-colors duration-quick ease-standard hover:bg-action-hover wide:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Deploy Now
          </a>
          <a
            className="flex min-h-touch w-full items-center justify-center rounded-control border border-solid border-control px-inset transition-colors duration-quick ease-standard hover:bg-raised wide:w-auto"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
