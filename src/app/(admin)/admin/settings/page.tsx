"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { registerSchema } from "@/lib/validations/auth";

interface Admin {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    createdBy: string | null;
}

export default function AdminSettingsPage() {
    const { data: session } = useSession();
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Add admin form state
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchAdmins = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/list");
            if (res.ok) {
                const data = await res.json();
                setAdmins(data.admins);
            }
        } catch (err) {
            console.error("Failed to fetch admins:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    function resetForm() {
        setFormName("");
        setFormEmail("");
        setFormPassword("");
        setFormError(null);
    }

    async function handleAddAdmin(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);

        // Client-side validation
        const result = registerSchema.safeParse({
            name: formName,
            email: formEmail,
            password: formPassword,
        });
        if (!result.success) {
            setFormError(result.error.issues[0].message);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    email: formEmail,
                    password: formPassword,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setFormError(data.error || "Failed to create admin");
                return;
            }

            // Success — close dialog and refresh list
            setDialogOpen(false);
            resetForm();
            await fetchAdmins();
        } catch {
            setFormError("An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* ── Header ────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="mt-1 text-muted-foreground">
                        Manage admin users who can access this panel.
                    </p>
                </div>

                {/* ── Add Admin Dialog ─────────────────────── */}
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button id="add-admin-btn" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Admin
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Admin</DialogTitle>
                            <DialogDescription>
                                Create a new admin account. They will be able to manage
                                questions, tests, and invitations.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleAddAdmin} className="space-y-4">
                            {formError && (
                                <div
                                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                                    role="alert"
                                >
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="admin-name">Name</Label>
                                <Input
                                    id="admin-name"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Full name"
                                    disabled={submitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="admin-email">Email</Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    placeholder="admin@soliton.com"
                                    disabled={submitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="admin-password">Password</Label>
                                <Input
                                    id="admin-password"
                                    type="password"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder="Min 8 characters"
                                    disabled={submitting}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    id="create-admin-submit"
                                    type="submit"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating…
                                        </>
                                    ) : (
                                        "Create Admin"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── Admin Table ───────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4" />
                        Admin Users ({admins.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {admins.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No admin users found.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map((admin) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium">
                                            {admin.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {admin.email}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {admin.id === session?.user?.id ? (
                                                <Badge className="bg-primary/10 text-primary">
                                                    You
                                                </Badge>
                                            ) : admin.createdBy === null ? (
                                                <Badge variant="secondary">
                                                    Seed Admin
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    Admin
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
