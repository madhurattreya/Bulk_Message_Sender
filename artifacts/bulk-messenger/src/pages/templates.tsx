import { useState } from "react";
import { useListTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { Template, TemplateInputChannel } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Mail, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function Templates() {
  const { data: templates, isLoading } = useListTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    channel: TemplateInputChannel;
    subject: string;
    body: string;
  }>({
    name: "",
    channel: "email",
    subject: "",
    body: ""
  });

  const handleOpenDialog = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        channel: template.channel as TemplateInputChannel,
        subject: template.subject || "",
        body: template.body
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        channel: "email",
        subject: "",
        body: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ 
          id: editingTemplate.id, 
          data: {
            ...formData,
            subject: formData.channel === "email" ? formData.subject : null
          } 
        });
        toast({ title: "Template updated" });
      } else {
        await createTemplate.mutateAsync({ 
          data: {
            ...formData,
            subject: formData.channel === "email" ? formData.subject : null
          }
        });
        toast({ title: "Template created" });
      }
      queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      setIsDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to save template" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteTemplate.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      toast({ title: "Template deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to delete template" });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-2">Manage your message content for Email and WhatsApp.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : templates?.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-xl border border-dashed">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No templates yet</h3>
          <p className="text-muted-foreground mt-1 mb-4 max-w-md mx-auto">Create a template to start sending messages. You can use variables like {`{{name}}`}, {`{{email}}`}, and {`{{phone}}`} to personalize your content.</p>
          <Button onClick={() => handleOpenDialog()}>Create Template</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates?.map(template => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {template.channel === "email" ? (
                      <Mail className="w-4 h-4 text-primary" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    )}
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                </div>
                {template.subject && <CardDescription className="line-clamp-1">{template.subject}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-1">
                <div className="bg-muted p-3 rounded-md text-sm font-mono whitespace-pre-wrap line-clamp-6 text-muted-foreground">
                  {template.body}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(template)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Welcome Series 1" />
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={formData.channel} onValueChange={(val: TemplateInputChannel) => setFormData({...formData, channel: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.channel === "email" && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Email subject line..." />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea 
                value={formData.body} 
                onChange={e => setFormData({...formData, body: e.target.value})} 
                placeholder={`Hi {{name}},\n\nWelcome to...`}
                className="h-48 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Available variables: <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{{name}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{{email}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{{phone}}`}</code>, and any extra column from your contact upload like <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{{company_name}}`}</code>.
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg border">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Live Preview</Label>
              <div className="whitespace-pre-wrap text-sm">
                {formData.body.replace(/\{\{name\}\}/g, "Jane Doe").replace(/\{\{email\}\}/g, "jane@example.com").replace(/\{\{phone\}\}/g, "+1234567890")}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.body || (formData.channel === "email" && !formData.subject)}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Required missing import added locally
import { FileText } from "lucide-react";
