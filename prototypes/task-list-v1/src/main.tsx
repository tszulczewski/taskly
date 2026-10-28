import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "../silnik/comments.js";
import "../silnik/prototype.js";
import { App } from "./app";
import { DemoProvider } from "./store";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root.");

createRoot(root).render(
  <StrictMode>
    <DemoProvider>
      <App />
    </DemoProvider>
  </StrictMode>,
);
