import AdminClient from "./AdminClient";

export const revalidate = 86400;

function utilityDriveFolderUrl(): string | null {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!id) return null;
  return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
}

export default function AdminPage() {
  return <AdminClient driveFolderUrl={utilityDriveFolderUrl()} />;
}
