import { useState, useRef } from "react";
import { useListContacts, useUploadContacts, useDeleteContact, useDeleteAllContacts, getListContactsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Contacts() {
  const { data: contacts, isLoading } = useListContacts();
  const uploadContacts = useUploadContacts();
  const deleteContact = useDeleteContact();
  const deleteAllContacts = useDeleteAllContacts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      // @ts-expect-error FormData bypasses generated types cleanly via customFetch
      await uploadContacts.mutateAsync({ data: formData });
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      toast({
        title: "Contacts uploaded",
        description: "Your contacts have been successfully imported.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "There was an error uploading your contacts.",
      });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteContact.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      toast({ title: "Contact deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete contact" });
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete all contacts? This cannot be undone.")) return;
    try {
      await deleteAllContacts.mutateAsync({});
      queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() });
      toast({ title: "All contacts deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete contacts" });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-2">Manage your recipients for bulk messaging.</p>
        </div>
        <div className="flex gap-3">
          {contacts && contacts.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteAll} disabled={deleteAllContacts.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          )}
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadContacts.isPending}>
            <Upload className="w-4 h-4 mr-2" />
            {uploadContacts.isPending ? "Uploading..." : "Upload CSV/Excel"}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {!isLoading && contacts?.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No contacts yet</AlertTitle>
          <AlertDescription>
            Upload a CSV or Excel file to get started. The system will automatically map common columns like Name, Email, and Phone. Any extra columns will be saved for personalization in templates.
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-md flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : contacts?.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name || "-"}</TableCell>
                  <TableCell>{contact.email || "-"}</TableCell>
                  <TableCell>{contact.phone || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(contact.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(contact.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
