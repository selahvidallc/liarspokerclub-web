export type AppRole = "player" | "scorer" | "club_admin" | "super_admin";

export function canCreateGame(role?: AppRole) {
  return role === "scorer" || role === "club_admin" || role === "super_admin";
}

export function canAccessAdmin(role?: AppRole) {
  return role === "club_admin" || role === "super_admin";
}

export function canScore(role?: AppRole) {
  return role === "scorer" || role === "club_admin" || role === "super_admin";
}

export function isReadOnlyPlayer(role?: AppRole) {
  return role === "player";
}