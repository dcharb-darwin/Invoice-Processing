export type ProjectTab = "budget" | "contracts" | "invoices" | "funding" | "row" | "parcels" | "phases";

export function projectsHash(): string {
  return "#/";
}

export function projectHash(projectId: number): string {
  return `#/project/${projectId}`;
}

export function projectTabHash(projectId: number, tab?: ProjectTab | string): string {
  return tab ? `#/project/${projectId}/${tab}` : projectHash(projectId);
}
