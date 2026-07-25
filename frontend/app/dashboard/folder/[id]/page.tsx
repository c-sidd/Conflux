"use client";

import StorageExplorer from "../../storage-explorer";
import { useParams } from "next/navigation";

export default function FolderPage() {
  const params = useParams();
  const folderId = params?.id ? Number(params.id) : null;

  return <StorageExplorer folderId={folderId} />;
}
