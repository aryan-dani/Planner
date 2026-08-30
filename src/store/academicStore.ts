import { create } from "zustand";
import type { Branch, Semester } from "@/lib/academic/scope";
import {
  DEFAULT_BRANCH,
  DEFAULT_SEMESTER,
  writeStoredWorkspace,
} from "@/lib/workspace";

export type { Branch, Semester };

interface AcademicState {
  branch: Branch;
  semester: Semester;
  searchQuery: string;
  aiSearchQuery: string;
  isCommandPaletteOpen: boolean;
  setBranch: (branch: Branch) => void;
  setSemester: (sem: Semester) => void;
  setWorkspace: (branch: Branch, semester: Semester) => void;
  setSearchQuery: (query: string) => void;
  setAiSearchQuery: (query: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAcademicStore = create<AcademicState>((set) => ({
  branch: DEFAULT_BRANCH,
  semester: DEFAULT_SEMESTER,
  searchQuery: "",
  aiSearchQuery: "",
  isCommandPaletteOpen: false,
  setBranch: (branch) =>
    set((state) => {
      if (state.branch === branch) return state;
      writeStoredWorkspace(branch, state.semester);
      return { branch, searchQuery: "", aiSearchQuery: "" };
    }),
  setSemester: (semester) =>
    set((state) => {
      if (state.semester === semester) return state;
      writeStoredWorkspace(state.branch, semester);
      return { semester, searchQuery: "", aiSearchQuery: "" };
    }),
  setWorkspace: (branch, semester) => {
    set((state) => {
      if (state.branch === branch && state.semester === semester) return state;
      writeStoredWorkspace(branch, semester);
      return { branch, semester, searchQuery: "", aiSearchQuery: "" };
    });
  },
  setSearchQuery: (searchQuery) =>
    set((state) => ({
      searchQuery,
      aiSearchQuery: searchQuery.trim() === "" ? "" : state.aiSearchQuery,
    })),
  setAiSearchQuery: (aiSearchQuery) => set({ aiSearchQuery }),
  setCommandPaletteOpen: (isCommandPaletteOpen) =>
    set({ isCommandPaletteOpen }),
}));
