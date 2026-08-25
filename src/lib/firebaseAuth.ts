import {
  GithubAuthProvider,
  GoogleAuthProvider,
  getRedirectResult,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type AuthCredential,
  type OAuthCredential,
  type User,
} from "firebase/auth";

export function githubAuthProvider() {
  const provider = new GithubAuthProvider();
  provider.addScope("user:email");
  return provider;
}

export function googleAuthProvider() {
  return new GoogleAuthProvider();
}

const INTENT_KEY = "utility.auth.intent";
const MERGE_KEY = "utility.auth.merge";
const REDIRECT_TO_KEY = "utility.auth.redirectTo";

type AuthIntent =
  | "signin-google"
  | "signin-github"
  | "link-google"
  | "link-github"
  | "reauth-github"
  | "reauth-google";

type StoredMerge = {
  googleIdToken: string | null;
  googleAccessToken: string | null;
  githubAccessToken: string | null;
};

export type LinkMergeResult =
  | { status: "linked"; user: User }
  | { status: "redirecting" }
  | { status: "needs-github-confirm" }
  | { status: "needs-google-confirm" }
  | { status: "none" }
  | { status: "error"; code: string | null };

function providerIds(user: User) {
  return user.providerData.map((p) => p.providerId);
}

function isPopupBlocked(code: string | undefined) {
  return (
    code === "auth/popup-blocked" ||
    code === "auth/operation-not-supported-in-this-environment"
  );
}

function oauthParts(cred: AuthCredential | null) {
  const o = cred as OAuthCredential | null;
  return {
    idToken: o?.idToken ?? null,
    accessToken: o?.accessToken ?? null,
  };
}

function loadMerge(): StoredMerge | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MERGE_KEY);
    return raw ? (JSON.parse(raw) as StoredMerge) : null;
  } catch {
    return null;
  }
}

function saveMerge(next: StoredMerge) {
  sessionStorage.setItem(MERGE_KEY, JSON.stringify(next));
}

function clearMerge() {
  sessionStorage.removeItem(MERGE_KEY);
}

function setIntent(intent: AuthIntent) {
  sessionStorage.setItem(INTENT_KEY, intent);
}

function takeIntent(): AuthIntent | null {
  const intent = sessionStorage.getItem(INTENT_KEY) as AuthIntent | null;
  sessionStorage.removeItem(INTENT_KEY);
  return intent;
}

function googleFromStored(s: StoredMerge): AuthCredential | null {
  if (!s.googleIdToken && !s.googleAccessToken) return null;
  return GoogleAuthProvider.credential(s.googleIdToken, s.googleAccessToken);
}

function githubFromStored(s: StoredMerge): AuthCredential | null {
  if (!s.githubAccessToken) return null;
  return GithubAuthProvider.credential(s.githubAccessToken);
}

function stashGoogleFromError(err: unknown): boolean {
  const cred = GoogleAuthProvider.credentialFromError(err as any);
  const parts = oauthParts(cred);
  if (!parts.idToken && !parts.accessToken) return false;
  const prev = loadMerge() || { googleIdToken: null, googleAccessToken: null, githubAccessToken: null };
  saveMerge({ ...prev, googleIdToken: parts.idToken, googleAccessToken: parts.accessToken });
  return true;
}

function stashGithubFromError(err: unknown): boolean {
  const cred = GithubAuthProvider.credentialFromError(err as any);
  const token = oauthParts(cred).accessToken;
  if (!token) return false;
  const prev = loadMerge() || { googleIdToken: null, googleAccessToken: null, githubAccessToken: null };
  saveMerge({ ...prev, githubAccessToken: token });
  return true;
}

function stashGithubFromResult(result: { user?: User } & object) {
  const cred = GithubAuthProvider.credentialFromResult(result as any);
  const token = oauthParts(cred).accessToken;
  if (!token) return false;
  const prev = loadMerge() || { googleIdToken: null, googleAccessToken: null, githubAccessToken: null };
  saveMerge({ ...prev, githubAccessToken: token });
  return true;
}

export function rememberRedirectTo(path: string) {
  sessionStorage.setItem(REDIRECT_TO_KEY, path);
}

export function takeRememberedRedirectTo(): string | null {
  const value = sessionStorage.getItem(REDIRECT_TO_KEY);
  sessionStorage.removeItem(REDIRECT_TO_KEY);
  return value;
}

export function getPendingMergeStep(): "github" | "google" | null {
  const pending = loadMerge();
  if (!pending) return null;
  const hasGoogle = !!(pending.googleIdToken || pending.googleAccessToken);
  const hasGithub = !!pending.githubAccessToken;
  if (hasGoogle && !hasGithub) return "github";
  if (hasGithub && !hasGoogle) return "google";
  return null;
}

export async function signInWithPopupOrRedirect(auth: Auth, kind: "google" | "github") {
  const provider = kind === "github" ? githubAuthProvider() : googleAuthProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (!isPopupBlocked(err?.code)) throw err;
    setIntent(kind === "github" ? "signin-github" : "signin-google");
    await signInWithRedirect(auth, provider);
    return null;
  }
}

/** If GitHub email already belongs to Google, sign in with Google and attach GitHub. */
export async function linkGithubOverGoogleAccount(auth: Auth, err: unknown) {
  const code = (err as { code?: string })?.code;
  if (code !== "auth/account-exists-with-different-credential") return false;
  stashGithubFromError(err);
  const pending = GithubAuthProvider.credentialFromError(err as any);
  try {
    const google = await signInWithPopup(auth, googleAuthProvider());
    if (pending) {
      await linkWithCredential(google.user, pending);
    }
    clearMerge();
    return true;
  } catch (e: any) {
    if (!isPopupBlocked(e?.code)) throw e;
    setIntent("signin-google");
    await signInWithRedirect(auth, googleAuthProvider());
    return true;
  }
}

export async function startProviderLink(auth: Auth, kind: "google" | "github"): Promise<LinkMergeResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const provider = kind === "github" ? githubAuthProvider() : googleAuthProvider();
  const intent: AuthIntent = kind === "github" ? "link-github" : "link-google";

  try {
    const result = await linkWithPopup(user, provider);
    return { status: "linked", user: result.user };
  } catch (err: any) {
    if (isPopupBlocked(err?.code)) {
      setIntent(intent);
      await linkWithRedirect(user, provider);
      return { status: "redirecting" };
    }
    if (err?.code === "auth/credential-already-in-use") {
      if (kind === "google" && stashGoogleFromError(err)) {
        return { status: "needs-github-confirm" };
      }
      if (kind === "github" && stashGithubFromError(err)) {
        return { status: "needs-google-confirm" };
      }
    }
    throw err;
  }
}

export async function confirmMergeWithGithub(auth: Auth): Promise<LinkMergeResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  try {
    const reauth = await reauthenticateWithPopup(user, githubAuthProvider());
    stashGithubFromResult(reauth);
    const merged = await completeMerge(auth);
    return { status: "linked", user: merged };
  } catch (err: any) {
    if (!isPopupBlocked(err?.code)) throw err;
    setIntent("reauth-github");
    await reauthenticateWithRedirect(user, githubAuthProvider());
    return { status: "redirecting" };
  }
}

export async function confirmMergeWithGoogle(auth: Auth): Promise<LinkMergeResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  try {
    const reauth = await reauthenticateWithPopup(user, googleAuthProvider());
    const parts = oauthParts(GoogleAuthProvider.credentialFromResult(reauth));
    const prev = loadMerge() || { googleIdToken: null, googleAccessToken: null, githubAccessToken: null };
    saveMerge({ ...prev, googleIdToken: parts.idToken, googleAccessToken: parts.accessToken });
    const merged = await completeMerge(auth);
    return { status: "linked", user: merged };
  } catch (err: any) {
    if (!isPopupBlocked(err?.code)) throw err;
    setIntent("reauth-google");
    await reauthenticateWithRedirect(user, googleAuthProvider());
    return { status: "redirecting" };
  }
}

let redirectOutcome: LinkMergeResult | null = null;
let redirectOutcomePromise: Promise<LinkMergeResult> | null = null;

export async function consumeRedirectResult(auth: Auth): Promise<LinkMergeResult> {
  if (redirectOutcome) return redirectOutcome;
  if (!redirectOutcomePromise) {
    redirectOutcomePromise = consumeRedirectResultImpl(auth).then((result) => {
      redirectOutcome = result;
      return result;
    });
  }
  return redirectOutcomePromise;
}

async function consumeRedirectResultImpl(auth: Auth): Promise<LinkMergeResult> {
  await auth.authStateReady();
  const peekIntent = typeof window !== "undefined" ? (sessionStorage.getItem(INTENT_KEY) as AuthIntent | null) : null;

  try {
    const result = await getRedirectResult(auth);
    const intent = takeIntent();

    if (intent === "reauth-github" && result) {
      stashGithubFromResult(result);
      const merged = await completeMerge(auth);
      return { status: "linked", user: merged };
    }
    if (intent === "reauth-google" && result) {
      const parts = oauthParts(GoogleAuthProvider.credentialFromResult(result));
      const prev = loadMerge() || { googleIdToken: null, googleAccessToken: null, githubAccessToken: null };
      saveMerge({ ...prev, googleIdToken: parts.idToken, googleAccessToken: parts.accessToken });
      const merged = await completeMerge(auth);
      return { status: "linked", user: merged };
    }

    if (result && auth.currentUser) {
      const pending = loadMerge();
      const githubCred = pending ? githubFromStored(pending) : null;
      const ids = providerIds(auth.currentUser);
      if (githubCred && ids.includes("google.com") && !ids.includes("github.com")) {
        try {
          const linked = await linkWithCredential(auth.currentUser, githubCred);
          clearMerge();
          return { status: "linked", user: linked.user };
        } catch (linkErr: any) {
          if (linkErr?.code === "auth/credential-already-in-use") {
            const parts = oauthParts(GoogleAuthProvider.credentialFromResult(result));
            saveMerge({
              googleIdToken: parts.idToken,
              googleAccessToken: parts.accessToken,
              githubAccessToken: pending?.githubAccessToken ?? null,
            });
            const merged = await completeMerge(auth);
            return { status: "linked", user: merged };
          }
          throw linkErr;
        }
      }
      return { status: "linked", user: result.user };
    }

    const step = getPendingMergeStep();
    if (step === "github") return { status: "needs-github-confirm" };
    if (step === "google") return { status: "needs-google-confirm" };
    return { status: "none" };
  } catch (err: any) {
    const intent = takeIntent() || peekIntent;
    if (err?.code === "auth/credential-already-in-use") {
      if (intent === "link-github" || intent === "signin-github") {
        stashGithubFromError(err);
        return { status: "needs-google-confirm" };
      }
      stashGoogleFromError(err);
      return { status: "needs-github-confirm" };
    }
    return { status: "error", code: err?.code || null };
  }
}

async function attachGithub(user: User, githubCred: AuthCredential): Promise<User> {
  const linked = await linkWithCredential(user, githubCred);
  return linked.user;
}

async function completeMerge(auth: Auth): Promise<User> {
  const pending = loadMerge();
  const current = auth.currentUser;
  if (!pending || !current) {
    throw new Error("Missing accounts to merge.");
  }
  const googleCred = googleFromStored(pending);
  const githubCred = githubFromStored(pending);
  if (!googleCred || !githubCred) {
    throw new Error("Missing Google or GitHub credential to merge.");
  }

  const ids = providerIds(current);
  const currentIsGithubWithoutGoogle = ids.includes("github.com") && !ids.includes("google.com");

  if (currentIsGithubWithoutGoogle) {
    await current.delete();
    const googleSignIn = await signInWithCredential(auth, googleCred);
    const linked = await attachGithub(googleSignIn.user, githubCred);
    clearMerge();
    return linked;
  }

  if (ids.includes("google.com")) {
    await signInWithCredential(auth, githubCred);
    if (auth.currentUser) {
      await auth.currentUser.delete();
    }
    const googleSignIn = await signInWithCredential(auth, googleCred);
    const linked = await attachGithub(googleSignIn.user, githubCred);
    clearMerge();
    return linked;
  }

  throw new Error("Could not merge these accounts.");
}
