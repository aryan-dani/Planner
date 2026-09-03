import { Metadata } from "next";
import ProfileClientComponent from "@/app/profile/ProfileClientComponent";

export const metadata: Metadata = {
  title: "Profile Settings",
  description: "Customize your student profile, academic settings, and avatars.",
};

export default function ProfilePage() {
  return <ProfileClientComponent />;
}
