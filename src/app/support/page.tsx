"use client";

import React, { useState, useEffect } from "react";
import { 
  Heart, 
  Coffee, 
  Copy, 
  Check, 
  ExternalLink, 
  Smartphone, 
  MessageSquare, 
  Send,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from "lucide-react";
import { FadeIn, ScaleButton } from "@/components/Animations";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import Link from "next/link";

const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || "daniaryan212@okicici";
const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME || "Aryan Dani";

interface SupportTier {
  id: string;
  amount: number;
  label: string;
  description: string;
  icon: typeof Coffee | typeof Heart | typeof Zap;
  color: string;
}

const TIERS: SupportTier[] = [
  { 
    id: "chai", 
    amount: 20, 
    label: "Cutting Chai", 
    description: "Fuel a late-night study session.", 
    icon: Coffee, 
    color: "from-amber-500/20 to-orange-500/20 border-orange-500/30 text-orange-600 dark:text-orange-400" 
  },
  { 
    id: "coffee", 
    amount: 50, 
    label: "Hot Coffee", 
    description: "Keep the servers running for a day.", 
    icon: Coffee, 
    color: "from-amber-600/20 to-yellow-600/20 border-amber-500/30 text-amber-600 dark:text-amber-400" 
  },
  { 
    id: "energy", 
    amount: 100, 
    label: "Energy Drink", 
    description: "Power through intense exam prep.", 
    icon: Zap, 
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400" 
  },
  { 
    id: "premium", 
    amount: 250, 
    label: "Sponsor Pizza", 
    description: "Keep the updates coming all year.", 
    icon: Heart, 
    color: "from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400" 
  },
];

export default function SupportPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>("coffee");
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  // Form States
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTxnId, setFormTxnId] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setFormName(user.displayName || "");
        setFormEmail(user.email || "");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleTierSelect = (tierId: string, tierAmount: number) => {
    setSelectedTier(tierId);
    setAmount(tierAmount);
    setCustomAmount("");
    setQrLoading(true);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d+$/.test(val)) {
      setCustomAmount(val);
      setSelectedTier("custom");
      const numVal = parseInt(val, 10);
      setAmount(isNaN(numVal) ? 0 : numVal);
      setQrLoading(true);
    }
  };

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setIsCopied(true);
      toast.success("UPI ID copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy UPI ID");
    }
  };

  const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=Support%20Utility%20OS`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}&margin=10`;

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Please select or enter an amount first");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "support_messages"), {
        userId: currentUser?.uid || "anonymous",
        name: formName || "Anonymous Supporter",
        email: formEmail || "no-email@shared.com",
        txnId: formTxnId.trim(),
        message: formMessage.trim(),
        amount: amount,
        status: "pending_verification",
        createdAt: serverTimestamp(),
      });

      setIsSubmitted(true);
      toast.success("Thank you for your supportive message!");
      setFormTxnId("");
      setFormMessage("");
    } catch (error: any) {
      console.error("Error saving support message:", error);
      toast.error("Could not send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-12 relative overflow-hidden page-fade-in">
      {/* Background glow styling */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10 dark:bg-primary/5" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none -z-10 dark:bg-violet-500/5" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <FadeIn>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-border/80 rounded-full text-xs font-semibold text-muted mb-4 shadow-xs">
              <span>Completely Optional</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Support <span className="text-gradient-mono font-black">Utility OS</span>
            </h1>
            <p className="text-base text-foreground-subtle max-w-xl mx-auto leading-relaxed">
              Hi! I build and maintain Utility OS in my free time to make academic resources and planning easier for everyone. 
              If the platform helped you survive a semester, consider fueling future updates!
            </p>
          </FadeIn>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Tiers & Inputs */}
          <div className="md:col-span-7 space-y-6">
            <FadeIn delay={0.1}>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground mb-1">
                    Select an Amount
                  </h2>
                  <p className="text-xs text-muted">Choose a preset tier or write a custom contribution.</p>
                </div>

                {/* Preset Tiers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TIERS.map((tier) => {
                    const Icon = tier.icon;
                    const isActive = selectedTier === tier.id;
                    
                    // Thematic colored active glows and borders
                    let activeStyle = "";
                    if (isActive) {
                      switch (tier.id) {
                        case "chai":
                          activeStyle = "shadow-[0_0_15px_-3px_rgba(249,115,22,0.25)] border-orange-500/60 ring-1 ring-orange-500/20 bg-surface";
                          break;
                        case "coffee":
                          activeStyle = "shadow-[0_0_15px_-3px_rgba(245,158,11,0.25)] border-amber-500/60 ring-1 ring-amber-500/20 bg-surface";
                          break;
                        case "energy":
                          activeStyle = "shadow-[0_0_15px_-3px_rgba(59,130,246,0.25)] border-blue-500/60 ring-1 ring-blue-500/20 bg-surface";
                          break;
                        case "premium":
                          activeStyle = "shadow-[0_0_15px_-3px_rgba(244,63,94,0.25)] border-rose-500/60 ring-1 ring-rose-500/20 bg-surface";
                          break;
                        default:
                          activeStyle = "border-foreground/50 shadow-sm ring-1 ring-foreground/20 bg-surface";
                      }
                    } else {
                      activeStyle = "bg-surface/40 hover:bg-surface/80 border-border/60 hover:scale-[1.015]";
                    }

                    return (
                      <button
                        key={tier.id}
                        onClick={() => handleTierSelect(tier.id, tier.amount)}
                        className={`flex flex-col items-start text-left p-4 rounded-xl border transition-all duration-250 relative group overflow-hidden ${activeStyle}`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className={`p-1.5 rounded-lg border bg-background ${tier.color.split(" ").slice(0, 3).join(" ")}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="text-base font-bold text-foreground">₹{tier.amount}</span>
                        </div>
                        <h3 className="text-xs font-bold text-foreground">{tier.label}</h3>
                        <p className="text-[10px] text-muted leading-snug mt-1">{tier.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Divider / Or */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-border/60" />
                  <span className="text-[10px] font-bold text-muted uppercase">Or Custom</span>
                  <div className="flex-1 border-t border-border/60" />
                </div>

                {/* Custom Amount Input */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">₹</span>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Enter custom amount"
                    className="w-full pl-8 pr-4 py-3 bg-surface/50 border border-border/80 focus:border-foreground/50 focus:ring-1 focus:ring-foreground/20 rounded-xl text-sm font-semibold transition-all placeholder:text-muted/65 text-foreground"
                  />
                  {customAmount && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted uppercase">
                      Custom Active
                    </span>
                  )}
                </div>
              </div>
            </FadeIn>

            {/* Note/Message Form */}
            <FadeIn delay={0.2}>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-xs">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Write a Note of Support
                  </h2>
                  <p className="text-[10px] text-muted">Let me know who you are so I can send my thanks! Fill this out after scanning the QR code.</p>
                </div>

                {isSubmitted ? (
                  <div className="p-6 bg-surface/55 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">Message Saved!</h3>
                      <p className="text-[10px] text-muted mt-1 max-w-[280px] mx-auto">
                        Thank you so much! Your contribution keeps this platform alive.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-[10px] font-semibold text-primary hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitMessage} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1">Your Name</label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g. Aryan Dani"
                          className="w-full px-3 py-2 bg-surface/50 border border-border/80 focus:border-foreground/50 rounded-lg text-xs font-semibold text-foreground input-premium-focus"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="e.g. name@example.com"
                          className="w-full px-3 py-2 bg-surface/50 border border-border/80 focus:border-foreground/50 rounded-lg text-xs font-semibold text-foreground input-premium-focus"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1 flex items-center gap-1">
                          Ref/Transaction ID
                          <span className="text-[9px] lowercase font-normal text-muted/70">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={formTxnId}
                          onChange={(e) => setFormTxnId(e.target.value)}
                          placeholder="UPI Ref No. or ID"
                          className="w-full px-3 py-2 bg-surface/50 border border-border/80 focus:border-foreground/50 rounded-lg text-xs font-semibold text-foreground input-premium-focus"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-muted uppercase mb-1">Contribution Amount</label>
                        <div className="w-full px-3 py-2 bg-surface/30 border border-border/80 rounded-lg text-xs font-bold text-foreground flex items-center h-[34px]">
                          ₹{amount}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-muted uppercase mb-1">Appreciation Message</label>
                      <textarea
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        placeholder="Say something nice or suggest a new feature you'd like to see next!"
                        rows={3}
                        className="w-full px-3 py-2 bg-surface/50 border border-border/80 focus:border-foreground/50 rounded-lg text-xs font-semibold text-foreground resize-none input-premium-focus"
                      />
                    </div>

                    <ScaleButton
                      type="submit"
                      disabled={isSubmitting || amount <= 0}
                      className="w-full py-2.5 text-background font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 btn-premium-gradient"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmitting ? "Sending..." : "Submit Verification & Message"}
                    </ScaleButton>
                  </form>
                )}
              </div>
            </FadeIn>
          </div>

          {/* Right Column: QR Code Box */}
          <div className="md:col-span-5">
            <FadeIn delay={0.25}>
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-primary to-indigo-500 animate-gradient" />
                
                <div>
                  <h2 className="text-base font-bold text-foreground mb-1">Scan & Pay</h2>
                  <p className="text-xs text-muted">Use any UPI app on your phone to scan</p>
                </div>

                {/* QR Code Container */}
                <div className="relative mx-auto w-[250px] h-[250px] bg-white p-3 rounded-2xl shadow-inner border border-border/50 flex items-center justify-center group">
                  {qrLoading && (
                    <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center z-10">
                      <div className="w-8 h-8 rounded-full border-2 border-muted border-t-foreground animate-spin" />
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="UPI Payment QR Code"
                    width={250}
                    height={250}
                    onLoad={() => setQrLoading(false)}
                    className="w-full h-full object-contain select-none"
                  />
                </div>

                {/* Selected Amount Info */}
                <div className="bg-surface/50 border border-border/70 p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Sending Amount</span>
                  <p className="text-2xl font-black text-foreground mt-0.5">₹{amount}</p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Copy VPA */}
                  <button
                    onClick={handleCopyUPI}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-surface/50 border border-border hover:border-border-strong hover:bg-surface transition-all rounded-xl text-xs font-semibold text-foreground shadow-xs group"
                  >
                    <span className="truncate pr-2">
                      <span className="text-muted">UPI VPA: </span>
                      <strong className="font-bold text-foreground">{UPI_ID}</strong>
                    </span>
                    {isCopied ? (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted group-hover:text-foreground transition-colors shrink-0" />
                    )}
                  </button>

                  {/* Direct Deep link for Mobile */}
                  <a
                    href={upiUrl}
                    className="w-full py-3 text-background rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 btn-premium-gradient animate-pulse-subtle"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay via UPI App Directly</span>
                  </a>
                </div>

                {/* Additional Trust Indicators */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-center gap-3 text-muted">
                  <div className="flex items-center gap-1 text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Secure UPI Protocol</span>
                  </div>
                  <div className="h-3 w-px bg-border/60" />
                  <div className="flex items-center gap-1 text-[10px]">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    <span>Instant Credit</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

        </div>

        {/* Footer info link */}
        <div className="text-center mt-12">
          <Link href="/" className="text-xs text-muted hover:text-foreground underline underline-offset-4 font-semibold transition-all">
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
