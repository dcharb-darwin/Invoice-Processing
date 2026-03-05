export function topNavButtonClass(active: boolean): string {
  return active ? "ipc-nav-button ipc-nav-button--active" : "ipc-nav-button";
}

export function topTabButtonClass(active: boolean): string {
  return active ? "ipc-top-tab ipc-top-tab--active" : "ipc-top-tab";
}

export function docTabButtonClass(active: boolean): string {
  return active ? "ipc-doc-tab ipc-doc-tab--active" : "ipc-doc-tab";
}
