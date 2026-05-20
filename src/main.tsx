import React from "react";
import ReactDOM from "react-dom/client";
import { auth } from "./auth";
import App from "./App";
import "./styles.css";

auth.guard().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
