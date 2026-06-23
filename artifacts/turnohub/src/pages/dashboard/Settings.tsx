import { useGetMyProfessionalProfile, useUpdateMyProfessionalProfile, getGetMyProfessionalProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { data: profile, isLoading } = useGetMyProfessionalProfile();
  const updateMutation = useUpdateMyProfessionalProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    phone: "",
    whatsappNumber: "",
    city: "",
    address: "",
    instagramUrl: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        bio: profile.bio || "",
        phone: profile.phone || "",
        whatsappNumber: profile.whatsappNumber || "",
        city: profile.city || "",
        address: profile.address || "",
        instagramUrl: profile.instagramUrl || "",
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Profile updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetMyProfessionalProfileQueryKey() });
      },
      onError: () => toast({ title: "Failed to update profile", variant: "destructive" })
    });
  };

  if (isLoading) return <div className="p-8 animate-pulse space-y-4"><div className="h-8 bg-muted w-1/4 rounded"></div><div className="h-64 bg-muted rounded-xl"></div></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your public profile and contact information.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Public Information</CardTitle>
            <CardDescription>This information will be displayed on your public booking page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Public Booking Link</Label>
              <div className="flex bg-muted rounded-md p-2 text-sm">
                <span className="text-muted-foreground">turnohub.com/booking/</span>
                <span className="font-semibold">{profile?.slug}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} rows={4} placeholder="Tell your clients a bit about yourself..." />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input id="whatsapp" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} placeholder="+54 9 11 1234-5678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input id="instagram" value={formData.instagramUrl} onChange={e => setFormData({...formData, instagramUrl: e.target.value})} placeholder="https://instagram.com/yourhandle" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6 bg-muted/20">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
