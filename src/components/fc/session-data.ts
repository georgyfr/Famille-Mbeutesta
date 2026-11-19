"use client";

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES DE SESSION — Famille.Mbeutetsa (v36)
//
// La page d'accueil générique (dashboard.tsx) est SUPPRIMÉE (demande de
// l'administrateur : « supprime cette page complètement ainsi que dans les
// comptes des autres membres — désormais, la page qui suit la géolocalisation
// est la page propre au statut »). Les types de session migrent ICI : MainApp
// (inscription, wizard de géolocalisation, redirection vers la console du
// poste) continue de les utiliser pour l'ensemble de l'application.
// ─────────────────────────────────────────────────────────────────────────────

export type SessionLocation = {
  country: string | null;
  region: string | null;
  department: string | null;
  city: string | null;
  arrondissement: string | null;
  quartier: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type SessionData = {
  user: {
    id: string; fullName: string; phone?: string | null; email?: string | null;
    role: string; hasPin: boolean; hasLocation: boolean;
  };
  member: { id: string; branch: string; role: string; status: string } | null;
  location: SessionLocation | null;
  device: { id: string; name: string; type: string } | null;
  unreadCount: number;
  hasPasskey: boolean;
};
