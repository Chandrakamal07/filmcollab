import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DIRECTORY_STORAGE_BUCKET,
  toCanonicalDirectoryStorageUri,
  cleanupUploadedStorageObjects,
} from "@/lib/directory-storage";

interface AddFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
  userId?: string;
  projectId?: string | null;
}

export function AddFileDialog({ open, onOpenChange, onUploadSuccess, userId, projectId }: AddFileDialogProps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedAddFiles, setSelectedAddFiles] = useState<File[]>([]);
  const [addFileTitle, setAddFileTitle] = useState("");
  const [fileType, setFileType] = useState<"image" | "video" | "document" | "audio">("image");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoInputMode, setVideoInputMode] = useState<"upload" | "link">("upload");
  const [selectedCoverImage, setSelectedCoverImage] = useState<File | null>(null);
  const [isUploadingDirectoryFile, setIsUploadingDirectoryFile] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from("directory_categories")
          .select("name")
          .eq("file_type", fileType)
          .order("name");
        
        if (!error && data) {
          const parsed = data
            .map((d: any) => d.name.split(',').map((s: string) => s.trim()))
            .flat()
            .filter(Boolean);
          const uniqueCategories = Array.from(new Set(parsed)) as string[];
          setCategories(uniqueCategories);
          if (uniqueCategories.length > 0) {
            setSelectedCategory(uniqueCategories[0]);
          } else {
            setSelectedCategory("");
          }
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    if (open) {
      fetchCategories();
    }
  }, [fileType, open]);

  const handleAddFileSubmit = async () => {
    if (!userId) {
      toast.error("Please ensure you are logged in.");
      return;
    }

    if (selectedAddFiles.length === 0 && !(fileType === "video" && videoUrl.trim())) {
      toast.error("Please select a file or provide a video URL.");
      return;
    }

    const uploadedPaths: string[] = [];
    try {
      setIsUploadingDirectoryFile(true);
      let fileReferenceUrl = "";
      let primaryStoragePath: string | null = null;
      const additionalUrls: string[] = [];
      const additionalStoragePaths: string[] = [];
      let finalName = "";
      let finalSize = "0 MB";

      if (selectedAddFiles.length > 0) {
        // Upload the primary file (first file)
        const primaryFile = selectedAddFiles[0];
        const primaryExt = primaryFile.name.split('.').pop();
        const primaryName = `${crypto.randomUUID()}.${primaryExt}`;
        const primaryPath = `${userId}/${primaryName}`;

        const { error: primaryUploadError } = await supabase.storage
          .from(DIRECTORY_STORAGE_BUCKET)
          .upload(primaryPath, primaryFile);

        if (primaryUploadError) throw primaryUploadError;
        uploadedPaths.push(primaryPath);
        primaryStoragePath = primaryPath;
        fileReferenceUrl = toCanonicalDirectoryStorageUri(primaryPath, DIRECTORY_STORAGE_BUCKET);
        finalName = primaryFile.name;
        finalSize = `${(primaryFile.size / (1024 * 1024)).toFixed(2)} MB`;

        // Upload additional files if any
        if (selectedAddFiles.length > 1) {
          for (let i = 1; i < selectedAddFiles.length; i++) {
            const file = selectedAddFiles[i];
            const ext = file.name.split('.').pop();
            const name = `${crypto.randomUUID()}.${ext}`;
            const path = `${userId}/${name}`;

            const { error: uploadError } = await supabase.storage
              .from(DIRECTORY_STORAGE_BUCKET)
              .upload(path, file);

            if (uploadError) throw uploadError;
            uploadedPaths.push(path);
            additionalStoragePaths.push(path);
            additionalUrls.push(toCanonicalDirectoryStorageUri(path, DIRECTORY_STORAGE_BUCKET));
          }
        }
      } else {
        // Video URL
        fileReferenceUrl = videoUrl.trim();
        finalName = "Linked Video";
        finalSize = "Link";
      }

      let coverUrl = "";
      let coverStoragePath: string | null = null;
      if (selectedCoverImage) {
        const coverExt = selectedCoverImage.name.split('.').pop();
        const coverName = `${crypto.randomUUID()}_cover.${coverExt}`;
        const coverPath = `${userId}/${coverName}`;

        const { error: coverUploadError } = await supabase.storage
          .from(DIRECTORY_STORAGE_BUCKET)
          .upload(coverPath, selectedCoverImage);

        if (coverUploadError) throw coverUploadError;
        uploadedPaths.push(coverPath);
        coverStoragePath = coverPath;
        coverUrl = toCanonicalDirectoryStorageUri(coverPath, DIRECTORY_STORAGE_BUCKET);
      }

      const finalTitle = addFileTitle.trim() || finalName.replace(/\.[^/.]+$/, "");

      let fileUserId = userId;
      let ownerShowDirectory = true;
      if (userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, privacy_show_directory')
          .or(`id.eq.${userId},user_id.eq.${userId}`)
          .limit(1)
          .maybeSingle();
        if (prof?.id) fileUserId = prof.id;
        if (typeof (prof as any)?.privacy_show_directory === "boolean") {
          ownerShowDirectory = (prof as any).privacy_show_directory;
        }
      }

      const { error: insertError } = await supabase
        .from('directory_files')
        .insert({
          user_id: fileUserId,
          project_id: projectId || null,
          title: finalTitle,
          file_url: fileReferenceUrl,
          additional_urls: additionalUrls.length > 0 ? additionalUrls : [],
          cover_image_url: coverUrl || null,
          storage_bucket: DIRECTORY_STORAGE_BUCKET,
          storage_path: primaryStoragePath,
          additional_paths: additionalStoragePaths,
          cover_storage_path: coverStoragePath,
          is_public: ownerShowDirectory,
          file_type: fileType,
          file_size: finalSize,
          tags: selectedCategory ? [selectedCategory] : [],
          stats: { likes: 0, views: 0, downloads: 0, coverUrl: coverUrl }
        } as any);

      if (insertError) throw insertError;

      setSelectedAddFiles([]);
      setVideoUrl("");
      setFileType("image");
      setVideoInputMode("upload");
      setSelectedCoverImage(null);
      setSelectedCategory("");
      onOpenChange(false);

      toast.success("File uploaded successfully");
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }

    } catch (err: any) {
      if (uploadedPaths.length > 0) {
        await cleanupUploadedStorageObjects(uploadedPaths, DIRECTORY_STORAGE_BUCKET);
      }
      console.error("Error uploading file:", err);
      toast.error(err.message || "An error occurred while uploading.");
    } finally {
      setIsUploadingDirectoryFile(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card text-card-foreground border-border/80 shadow-noir rounded-xl">
        <DialogHeader>
          <span className="noir-eyebrow text-primary">Asset Upload</span>
          <DialogTitle className="text-xl font-display font-semibold text-foreground tracking-tight">Add Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className={categories.length > 0 ? "grid grid-cols-2 gap-4" : "space-y-1.5"}>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">File Type</Label>
              <Select
                value={fileType}
                onValueChange={(val: any) => {
                  setFileType(val);
                  setSelectedAddFiles([]);
                  setVideoUrl("");
                }}
              >
                <SelectTrigger className="h-10 w-full bg-surface-elevated border-border/80 text-foreground focus:ring-primary/40">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground border-border/80">
                  <SelectItem value="image">Photo</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {categories.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="h-10 w-full bg-surface-elevated border-border/80 text-foreground focus:ring-primary/40">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground border-border/80">
                    {categories.map((catName, idx) => (
                      <SelectItem key={idx} value={catName}>{catName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {fileType === "video" && (
            <div className="flex bg-surface-elevated border border-border/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setVideoInputMode("upload")}
                className={cn(
                  "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                  videoInputMode === "upload" 
                    ? "bg-card shadow-sm text-primary border border-primary/30" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setVideoInputMode("link")}
                className={cn(
                  "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
                  videoInputMode === "link" 
                    ? "bg-card shadow-sm text-primary border border-primary/30" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Provide Link
              </button>
            </div>
          )}

          {(fileType !== "video" || videoInputMode === "upload") && (
            <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                if (fileType === 'image') {
                  setSelectedAddFiles(files);
                  if (!addFileTitle && files[0]) setAddFileTitle(files[0].name.replace(/\.[^/.]+$/, ""));
                } else {
                  setSelectedAddFiles([files[0]]);
                  if (!addFileTitle) setAddFileTitle(files[0].name.replace(/\.[^/.]+$/, ""));
                }
              }
            }}
            onClick={() => addFileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2",
              isDraggingFile
                ? "border-primary bg-primary/10"
                : "border-border/80 hover:border-primary/60 bg-surface-elevated/60 hover:bg-surface-hover/50"
            )}
          >
            <input
              type="file"
              multiple={fileType === 'image'}
              ref={addFileInputRef}
              className="hidden"
              accept={
                fileType === 'image' ? 'image/*' :
                fileType === 'video' ? 'video/*' :
                fileType === 'audio' ? 'audio/*' :
                fileType === 'document' ? '.pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx' : undefined
              }
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const files = Array.from(e.target.files);
                  if (fileType === 'image') {
                    setSelectedAddFiles(files);
                    if (!addFileTitle && files[0]) setAddFileTitle(files[0].name.replace(/\.[^/.]+$/, ""));
                  } else {
                    setSelectedAddFiles([files[0]]);
                    if (!addFileTitle) setAddFileTitle(files[0].name.replace(/\.[^/.]+$/, ""));
                  }
                }
              }}
            />
            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Upload className="w-5 h-5" />
            </div>
            {selectedAddFiles.length > 0 ? (
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedAddFiles.length === 1 ? selectedAddFiles[0].name : `${selectedAddFiles.length} files selected`}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {selectedAddFiles.length === 1 
                    ? `${(selectedAddFiles[0].size / (1024 * 1024)).toFixed(2)} MB` 
                    : `${(selectedAddFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB total`}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drag and drop your {fileType} here, or <span className="text-primary underline font-semibold">browse</span>
                </p>
              </div>
            )}
          </div>
          )}

          {fileType === "video" && videoInputMode === "link" && (
            <div className="space-y-1.5">
              <Label htmlFor="video-url" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Video URL (YouTube/Instagram/Facebook/Direct)</Label>
              <Input
                id="video-url"
                placeholder="https://..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="bg-surface-elevated text-foreground border-border/80 focus-visible:ring-primary/40"
              />
            </div>
          )}

          {(fileType === "document" || fileType === "audio" || fileType === "video") && (
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cover Image (Thumbnail)</Label>
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => coverImageInputRef.current?.click()}
                  className="border-dashed border-border/80 bg-surface-elevated hover:border-primary/60 hover:bg-primary/10 text-xs text-foreground"
                >
                  <Upload className="w-4 h-4 mr-1.5 text-primary" />
                  {selectedCoverImage ? "Change Cover" : "Upload Cover Image"}
                </Button>
                {selectedCoverImage && (
                  <span className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                    {selectedCoverImage.name}
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={coverImageInputRef}
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedCoverImage(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="add-file-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              id="add-file-title"
              placeholder="Enter file title"
              value={addFileTitle}
              onChange={(e) => setAddFileTitle(e.target.value)}
              className="bg-surface-elevated text-foreground border-border/80 focus-visible:ring-primary/40"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedAddFiles([]);
                setAddFileTitle("");
                setVideoUrl("");
                setFileType("image");
              }}
              className="border-border/80 text-foreground hover:bg-surface-hover hover:border-primary/40 transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFileSubmit}
              disabled={isUploadingDirectoryFile}
              className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-sm transition-all"
            >
              {isUploadingDirectoryFile ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
