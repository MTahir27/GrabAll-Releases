const api = typeof browser !== "undefined" ? browser : chrome;
const HOST_NAME = "com.graball.host";

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: "graball-link",
    title: "Download link with GrabAll",
    contexts: ["link"],
  });
  api.contextMenus.create({
    id: "graball-page-links",
    title: "Download all links on this page",
    contexts: ["page"],
  });
});

api.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "graball-link" && info.linkUrl) {
    try {
      await api.runtime.sendNativeMessage(HOST_NAME, {
        type: "add_url",
        url: info.linkUrl,
      });
    } catch {
      // Fallback to graball:// scheme if native host unavailable
    }
  }
});
