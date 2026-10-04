"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";

import useUser from "@/lib/users/useUser";
import {
  profileUpdateSchema,
  ProfileUpdateValues,
} from "@/lib/validations/profile.schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { S3Uploader } from "@/components/ui/s3-uploader";

export default function ProfilePage() {
  const { user, isLoading, mutate } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const form = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.name || "",
      image: user?.image || null,
    },
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        image: user.image || null,
      });
      setAvatarUrl(user.image || "");
    }
  }, [user, form]);

  const handleAvatarUpload = async (fileUrls: string[]) => {
    if (fileUrls.length === 0) return;

    const uploadedUrl = fileUrls[0];
    setAvatarUrl(uploadedUrl);
    form.setValue("image", uploadedUrl);

    try {
      const response = await fetch("/api/app/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.getValues("name"),
          image: uploadedUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save avatar");
      }

      await mutate();
      toast.success("Avatar updated successfully!");
    } catch (error) {
      console.error("Avatar save error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save avatar"
      );
    }
  };

  const onSubmit = async (data: ProfileUpdateValues) => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/app/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      // Update the user data in SWR cache
      await mutate();

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const displayAvatarUrl = avatarUrl || user?.image || "";
  const userInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile information and avatar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col gap-4">
                <FormLabel>Profile Picture</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={displayAvatarUrl}
                      alt={user?.name || "Profile"}
                    />
                    <AvatarFallback className="text-lg">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <S3Uploader
                      presignedRouteProvider="/api/app/me/upload-avatar"
                      variant="button"
                      onUpload={handleAvatarUpload}
                      accept="image/*"
                      maxSize={5 * 1024 * 1024} // 5MB
                      buttonText="Change Avatar"
                      buttonVariant="outline"
                      buttonSize="sm"
                      className="w-fit"
                    />
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <FormLabel>Email Address</FormLabel>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-4 w-4" />
                      Update Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and membership information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Member Since</span>
            <span className="text-sm text-muted-foreground">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Account ID</span>
            <span className="text-sm text-muted-foreground font-mono">
              {user?.id || "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
