import { activateToolByIntent, toast } from "./activateTool";
import type { Intent } from "./intent";

function dispatchCreatorImage(prompt?: string) {
  window.dispatchEvent(
    new CustomEvent("creator:image:generate", {
      detail: { prompt }
    })
  );
}

export async function handleUserIntent(intent: Intent) {
  await activateToolByIntent(intent);

  switch (intent.kind) {
    case "CREATE_IMAGE": {
      const prompt = typeof intent.payload?.prompt === "string" ? intent.payload.prompt : undefined;
      dispatchCreatorImage(prompt);
      toast("Opening Creator Studio → Image Generator");
      break;
    }
    case "EDIT_IMAGE": {
      const prompt = typeof intent.payload?.prompt === "string" ? intent.payload.prompt : undefined;
      dispatchCreatorImage(prompt);
      toast("Routing to Creator Studio for edit");
      break;
    }
    case "ANALYZE_MEDIA": {
      toast("Opening Dissecting Media Studio");
      break;
    }
    case "ANALYZE_DOC": {
      toast("Opening DLL Studio");
      break;
    }
    case "MAKE_CALL": {
      toast("Opening Outreach Studio");
      break;
    }
    case "SEND_EMAIL": {
      toast("Opening Campaign Studio");
      break;
    }
    case "OPEN_DBL": {
      toast("Opening Digital Book of Life");
      break;
    }
    case "OPEN_TA": {
      toast("Opening Toning & Adjustments");
      break;
    }
    case "WRITE_CONTENT":
    default: {
      toast("Opening Writer's Studio");
      break;
    }
  }
}
