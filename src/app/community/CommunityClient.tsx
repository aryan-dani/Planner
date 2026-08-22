"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAcademicStore } from "@/store/academicStore";
import { useSRSStore } from "@/store/srsStore";
import {
  Search,
  ThumbsUp,
  Layers,
  User,
  Calendar,
  BookOpen,
  X,
  ArrowRight,
  Check,
  Trash2,
  Flame,
  Clock,
  ExternalLink,
  MessageCircle,
  Megaphone,
  MessagesSquare,
  Bug,
  Pin,
} from "lucide-react";
import { logActivity } from "@/lib/activity";
import { toast } from "sonner";

const WHATSAPP_COMMUNITY_URL =
  "https://chat.whatsapp.com/IptJTcvj4F848iY2riZ3YZ";

const WHATSAPP_GROUPS = [
  {
    name: "Announcements",
    blurb: "Official updates, feature launches, and the pinned community guide.",
    tip: "Start here",
    Icon: Megaphone,
  },
  {
    name: "General",
    blurb: "Everyday chat with peers. New here? Check Announcements first.",
    tip: "Hang out",
    Icon: MessagesSquare,
  },
  {
    name: "Academic Help",
    blurb: "Syllabus doubts, resources, labs, and exam-season questions.",
    tip: "Ask peers",
    Icon: BookOpen,
  },
  {
    name: "Feedback & Bugs",
    blurb: "Report broken previews, request features, or flag site issues.",
    tip: "Improve Utility",
    Icon: Bug,
  },
] as const;

interface CommunityDeck {
  id: string;
  title: string;
  branch: string;
  semester: number;
  author_name: string;
  author_uid?: string;
  upvotes: number;
  cardCount?: number;
  flashcards: any[];
  created_at: string;
}

interface CommunityClientProps {
  initialDecks: CommunityDeck[];
}

export default function CommunityClient({
  initialDecks,
}: CommunityClientProps) {
  const router = useRouter();
  const { searchQuery } = useAcademicStore();
  const { createDeck, addMultipleCards, initStore } = useSRSStore();
  const [decks, setDecks] = useState<CommunityDeck[]>(initialDecks);
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [upvotedDecks, setUpvotedDecks] = useState<Record<string, boolean>>({});
  const [activeDeck, setActiveDeck] = useState<CommunityDeck | null>(null);
  const [currentCardIdx, setCurrentCardIdx] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [copiedDeckId, setCopiedDeckId] = useState<string | null>(null);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"top" | "newest">("top");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    initStore();
  }, [initStore]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user?.uid ?? null);
    });
    return () => unsubscribe();
  }, []);

  const handleUpvote = async (deckId: string, currentUpvotes: number) => {
    if (upvotedDecks[deckId]) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("Sign in to upvote decks.");
      return;
    }

    const newUpvotes = currentUpvotes + 1;
    setUpvotedDecks((prev) => ({ ...prev, [deckId]: true }));
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, upvotes: newUpvotes } : d)),
    );

    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/community-decks/${deckId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: "upvote" }),
      });
      if (!res.ok) {
        throw new Error("Failed to upvote");
      }
      const data = await res.json();
      if (typeof data.upvotes === "number") {
        setDecks((prev) =>
          prev.map((d) =>
            d.id === deckId ? { ...d, upvotes: data.upvotes } : d,
          ),
        );
      }
      logActivity("community_deck_upvoted", 1);
    } catch (err) {
      console.warn("Upvote error:", err);
      setUpvotedDecks((prev) => {
        const next = { ...prev };
        delete next[deckId];
        return next;
      });
      setDecks((prev) =>
        prev.map((d) =>
          d.id === deckId ? { ...d, upvotes: currentUpvotes } : d,
        ),
      );
      toast.error("Failed to upvote deck.");
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this deck? This action cannot be undone.",
      )
    )
      return;

    setIsDeleting(deckId);
    try {
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : "";
      const res = await fetch(`/api/community-decks/${deckId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      toast.success("Deck deleted successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete deck");
    } finally {
      setIsDeleting(null);
    }
  };

  const ensureDeckCards = async (deck: CommunityDeck): Promise<CommunityDeck> => {
    if (Array.isArray(deck.flashcards) && deck.flashcards.length > 0) {
      return deck;
    }
    const res = await fetch(`/api/community-decks/${deck.id}`);
    if (!res.ok) {
      throw new Error("Failed to load deck cards");
    }
    const data = await res.json();
    const flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];
    const hydrated = {
      ...deck,
      flashcards,
      cardCount: data.cardCount ?? flashcards.length,
    };
    setDecks((prev) =>
      prev.map((d) => (d.id === deck.id ? hydrated : d)),
    );
    return hydrated;
  };

  const handleCopyDeck = async (deck: CommunityDeck) => {
    try {
      const full = await ensureDeckCards(deck);
      initStore();
      const newDeck = createDeck(full.title || "Community Deck");
      const cards = (Array.isArray(full.flashcards) ? full.flashcards : [])
        .map((card: { question?: string; answer?: string }) => ({
          question: String(card?.question || "").trim(),
          answer: String(card?.answer || "").trim(),
        }))
        .filter((card) => card.question.length > 0);

      if (cards.length === 0) {
        toast.error("This deck has no cards to save.");
        return;
      }

      addMultipleCards(newDeck.id, cards);
      setCopiedDeckId(deck.id);
      logActivity("community_deck_copied", 1);
      toast.success(`Saved “${newDeck.name}” to SRS (${cards.length} cards)`);
      router.push("/srs");
      setTimeout(() => setCopiedDeckId(null), 2000);
    } catch (err) {
      toast.error("Failed to save deck.");
    }
  };

  const handleStudyDeck = async (deck: CommunityDeck) => {
    try {
      const full = await ensureDeckCards(deck);
      setActiveDeck(full);
      setCurrentCardIdx(0);
      setShowAnswer(false);
    } catch {
      toast.error("Failed to load deck.");
    }
  };

  const filteredDecks = useMemo(() => {
    let result = decks.filter((deck) => {
      const matchBranch =
        selectedBranch === "ALL" || deck.branch === selectedBranch;
      const matchSearch =
        !searchQuery.trim() ||
        deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.author_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchSearch;
    });

    if (sortBy === "top") {
      result.sort((a, b) => b.upvotes - a.upvotes);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return result;
  }, [decks, selectedBranch, searchQuery, sortBy]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 min-h-[80vh]">
      {/* WhatsApp community */}
      <section className="mb-12 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 border-b border-border pb-6">
          <div className="min-w-0 max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-foreground shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
                WhatsApp community
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Utility OS · MIT-WPU
            </h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              One community invite unlocks four rooms. Pick what you need:
              updates, casual chat, academic help, or product feedback.
            </p>
          </div>
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 shrink-0 px-5 py-2.5 bg-foreground text-background text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity focus-visible:outline-offset-2"
          >
            Join on WhatsApp
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHATSAPP_GROUPS.map(({ name, blurb, tip, Icon }) => (
            <a
              key={name}
              href={WHATSAPP_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 text-left transition-colors hover:bg-surface/60 hover:border-border-strong focus-visible:outline-offset-2"
            >
              <div className="w-10 h-10 rounded-xl border border-border bg-surface flex items-center justify-center shrink-0 text-foreground group-hover:border-foreground/30 transition-colors">
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="text-sm font-bold text-foreground">{name}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted shrink-0">
                    {tip}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">{blurb}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <Pin className="w-4 h-4 text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              <span className="font-semibold text-foreground">New members:</span>{" "}
              WhatsApp often hides messages posted before you joined. Open{" "}
              <span className="font-semibold text-foreground">Announcements</span>{" "}
              and read the pinned guide. That&apos;s the standing reference, not
              the dated update posts.
            </p>
          </div>
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 shrink-0 text-xs font-semibold text-foreground underline underline-offset-4 hover:text-muted transition-colors"
          >
            Open community
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Decks header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Community Study Decks
          </h2>
          <p className="text-muted text-sm mt-1">
            Browse, upvote, and study flashcard decks shared by peer scholars
            across all engineering branches.
          </p>
        </div>

        {/* Branch Filter Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "AIDS", "CORE", "CSF"].map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBranch(b)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedBranch === b
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border hidden sm:block"></div>

          <div className="flex bg-surface border border-border p-0.5 rounded-xl shadow-xs">
            <button
              onClick={() => setSortBy("top")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortBy === "top"
                  ? "bg-foreground text-background font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <ThumbsUp
                className="w-3.5 h-3.5"
              />
              Top
            </button>
            <button
              onClick={() => setSortBy("newest")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortBy === "newest"
                  ? "bg-foreground text-background font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Newest
            </button>
          </div>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-xl overflow-hidden border border-border/70 shadow-sm">
        {filteredDecks.map((deck) => {
          const cardCount =
            typeof deck.cardCount === "number"
              ? deck.cardCount
              : Array.isArray(deck.flashcards)
                ? deck.flashcards.length
                : 0;
          const isUpvoted = upvotedDecks[deck.id];

          return (
            <div
              key={deck.id}
              className="bg-card p-6 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-surface border border-border text-foreground shrink-0">
                    {deck.branch} · Sem {deck.semester}
                  </span>
                  <div className="flex items-center gap-2">
                    {currentUserUid &&
                      deck.author_uid === currentUserUid && (
                        <button
                          onClick={() => handleDeleteDeck(deck.id)}
                          disabled={isDeleting === deck.id}
                          className="p-1.5 rounded-lg text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete Deck"
                        >
                          <Trash2
                            className={`w-4 h-4 ${isDeleting === deck.id ? "opacity-50" : ""}`}
                          />
                        </button>
                      )}
                    <button
                      onClick={() => handleUpvote(deck.id, deck.upvotes)}
                      disabled={isUpvoted}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isUpvoted
                          ? "bg-primary/10 border border-primary/30 text-primary"
                          : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover group-hover:border-border-strong"
                      }`}
                    >
                      <ThumbsUp
                        className={`w-3.5 h-3.5 ${isUpvoted ? "fill-current" : ""}`}
                      />
                      {deck.upvotes}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                  {deck.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-muted mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[120px]">
                      {deck.author_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{cardCount} Cards</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-border">
                <button
                  onClick={() => handleStudyDeck(deck)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
                >
                  <BookOpen className="w-4 h-4" />
                  Study Deck
                </button>
                <button
                  onClick={() => handleCopyDeck(deck)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs font-semibold hover:bg-surface-hover transition-all"
                >
                  {copiedDeckId === deck.id ? (
                    <>
                      <Check className="w-4 h-4 text-foreground" />
                      Copied!
                    </>
                  ) : (
                    "Save Deck"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty States */}
      {filteredDecks.length === 0 && (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-border rounded-2xl bg-surface my-12">
          <Search className="w-10 h-10 text-muted/30 mb-3" />
          <p className="text-base font-semibold text-foreground mb-1">
            No community decks found
          </p>
          <p className="text-sm text-muted mb-6">
            {searchQuery
              ? `No matches for "${searchQuery}"`
              : "Be the first scholar to publish a deck!"}
          </p>
          <a
            href="/ask"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Generate & Publish a Deck
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Modal Flashcard Viewer */}
      {activeDeck && (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border w-full max-w-2xl p-6 sm:p-8 shadow-popover rounded-2xl relative flex flex-col min-h-[400px]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Interactive Study Room
                </span>
                <h2 className="text-lg font-bold text-foreground mt-0.5">
                  {activeDeck.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveDeck(null)}
                className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Flashcard Display Area */}
            <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
              {activeDeck.flashcards &&
              activeDeck.flashcards[currentCardIdx] ? (
                <div
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="w-full max-w-lg min-h-[220px] p-8 border border-border bg-surface hover:shadow-card-hover rounded-2xl transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm select-none group relative hover:-translate-y-0.5"
                >
                  <span className="absolute top-4 right-4 text-[10px] font-mono text-muted uppercase bg-card border border-border px-2 py-1 rounded-md">
                    {showAnswer ? "Answer" : "Question"}
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed px-4">
                    {showAnswer
                      ? activeDeck.flashcards[currentCardIdx].answer
                      : activeDeck.flashcards[currentCardIdx].question}
                  </p>
                  <span className="text-xs text-muted mt-6 italic group-hover:text-foreground transition-colors">
                    Click card to flip
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted">Invalid flashcard format.</p>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between border-t border-border pt-6 mt-auto">
              <span className="text-xs font-bold text-muted">
                Card {currentCardIdx + 1} of{" "}
                {activeDeck.flashcards?.length || 0}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                    setShowAnswer(false);
                  }}
                  disabled={currentCardIdx === 0}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground text-xs font-semibold hover:bg-surface-hover disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    setCurrentCardIdx((prev) =>
                      Math.min(
                        (activeDeck.flashcards?.length || 1) - 1,
                        prev + 1,
                      ),
                    );
                    setShowAnswer(false);
                  }}
                  disabled={
                    currentCardIdx === (activeDeck.flashcards?.length || 1) - 1
                  }
                  className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Next Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
