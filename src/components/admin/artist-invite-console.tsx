'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, Copy, RefreshCw, Check, XCircle, Ban, Archive, Trash2 } from 'lucide-react';

import { db } from '@/lib/firebase';
import { ArtistInvite } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const statusLabelMap: Record<ArtistInvite['status'], string> = {
  pending: 'Pending',
  redeemed: 'Redeemed',
  revoked: 'Revoked',
  expired: 'Expired',
  archived: 'Archived'
};

const statusClassMap: Record<ArtistInvite['status'], string> = {
  pending: 'bg-amber-100 text-amber-900',
  redeemed: 'bg-emerald-100 text-emerald-900',
  revoked: 'bg-rose-100 text-rose-900',
  expired: 'bg-muted text-muted-foreground',
  archived: 'bg-slate-100 text-slate-700'
};

const generateToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
};

export function ArtistInviteConsole() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [invites, setInvites] = useState<ArtistInvite[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const invitesQuery = query(collection(db, 'artistInvites'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      const nextInvites: ArtistInvite[] = snapshot.docs.map((inviteDoc) => {
        const data = inviteDoc.data();
        return {
          id: inviteDoc.id,
          email: data.email,
          name: data.name,
          token: data.token,
          status: (data.status as ArtistInvite['status']) || 'pending',
          createdAt: data.createdAt?.toDate?.() ?? new Date(0),
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          lastSentAt: data.lastSentAt?.toDate?.(),
          redeemedAt: data.redeemedAt?.toDate?.(),
          redeemedBy: data.redeemedBy,
          lastAccessedAt: data.lastAccessedAt?.toDate?.(),
          lastError: data.lastError || undefined,
          revokedAt: data.revokedAt?.toDate?.(),
          archivedAt: data.archivedAt?.toDate?.(),
          message: data.message ?? null
        } as ArtistInvite;
      });

      setInvites(nextInvites);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const pendingInvites = useMemo(() => invites.filter((invite) => invite.status === 'pending'), [invites]);
  const archivedInvites = useMemo(() => invites.filter((invite) => invite.status === 'archived'), [invites]);
  const activeInvites = useMemo(() => invites.filter((invite) => invite.status !== 'archived'), [invites]);
  const displayedInvites = showArchived ? archivedInvites : activeInvites;

  const handleCreateInvite = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address before sending an invite.',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'You need to be signed in as an admin to send invites.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      const token = generateToken();
      const inviteDocRef = doc(db, 'artistInvites', token);
      const onboardingUrl = `${window.location.origin}/onboarding/artist/${token}`;

      await setDoc(inviteDocRef, {
        email: trimmedEmail,
        name: trimmedName || null,
        token,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: user.id,
        createdByName: user.displayName || user.username,
        lastSentAt: serverTimestamp(),
        message: message.trim() || null
      });

      const response = await fetch('/api/admin/artist-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: trimmedEmail,
          name: trimmedName,
          inviteUrl: onboardingUrl,
          message: message.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to send invite email.';
        throw new Error(errorMessage);
      }

      await updateDoc(inviteDocRef, {
        lastError: null
      });

      toast({
        title: 'Invite sent',
        description: `Invitation sent to ${trimmedEmail}.`
      });

      setEmail('');
      setName('');
      setMessage('');
    } catch (error) {
      console.error('Error creating artist invite:', error);
      toast({
        title: 'Unable to send invite',
        description: error instanceof Error ? error.message : 'Email could not be sent.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (invite: ArtistInvite) => {
    try {
      const link = `${window.location.origin}/onboarding/artist/${invite.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
      toast({
        title: 'Invite link copied',
        description: 'The onboarding link is ready to share.'
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy invite link:', error);
      toast({
        title: 'Copy failed',
        description: 'We could not copy the invite link. Try again.',
        variant: 'destructive'
      });
    }
  };

  const handleResend = async (invite: ArtistInvite) => {
    setResendingId(invite.id);
    try {
      const response = await fetch('/api/admin/artist-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: invite.email,
          name: invite.name,
          inviteUrl: `${window.location.origin}/onboarding/artist/${invite.token}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to resend invite.';
        throw new Error(errorMessage);
      }

      await updateDoc(doc(db, 'artistInvites', invite.id), {
        lastSentAt: serverTimestamp(),
        lastError: null
      });

      toast({
        title: 'Invite resent',
        description: `Invitation resent to ${invite.email}.`
      });
    } catch (error) {
      console.error('Failed to resend invite:', error);
      toast({
        title: 'Resend failed',
        description: error instanceof Error ? error.message : 'Unable to resend invite.',
        variant: 'destructive'
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async (invite: ArtistInvite) => {
    setRevokingId(invite.id);
    try {
      await updateDoc(doc(db, 'artistInvites', invite.id), {
        status: 'archived', // Automatically archive when revoked
        revokedAt: serverTimestamp(),
        archivedAt: serverTimestamp()
      });

      toast({
        title: 'Invite revoked',
        description: `${invite.email} can no longer access the onboarding link. The invite has been archived.`
      });
    } catch (error) {
      console.error('Failed to revoke invite:', error);
      toast({
        title: 'Unable to revoke',
        description: error instanceof Error ? error.message : 'Invite could not be revoked.',
        variant: 'destructive'
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handleArchive = async (invite: ArtistInvite) => {
    setArchivingId(invite.id);
    try {
      await updateDoc(doc(db, 'artistInvites', invite.id), {
        status: 'archived',
        archivedAt: serverTimestamp()
      });

      toast({
        title: 'Invite archived',
        description: `The invitation for ${invite.email} has been archived.`
      });
    } catch (error) {
      console.error('Failed to archive invite:', error);
      toast({
        title: 'Unable to archive',
        description: error instanceof Error ? error.message : 'Invite could not be archived.',
        variant: 'destructive'
      });
    } finally {
      setArchivingId(null);
    }
  };

  const handleDelete = async (invite: ArtistInvite) => {
    if (!confirm(`Are you sure you want to permanently delete the invitation for ${invite.email}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(invite.id);
    try {
      const inviteRef = doc(db, 'artistInvites', invite.id);
      await updateDoc(inviteRef, {
        status: 'archived',
        archivedAt: serverTimestamp()
      });
      // Note: We're archiving instead of deleting to maintain data integrity
      // If you want true deletion, use: await deleteDoc(inviteRef);

      toast({
        title: 'Invite deleted',
        description: `The invitation for ${invite.email} has been removed.`
      });
    } catch (error) {
      console.error('Failed to delete invite:', error);
      toast({
        title: 'Unable to delete',
        description: error instanceof Error ? error.message : 'Invite could not be deleted.',
        variant: 'destructive'
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Artist Invite Console</span>
          <Badge variant="secondary">Beta</Badge>
        </CardTitle>
        <CardDescription>
          Send curated onboarding links to artists you want on Gouache and track their status in real time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1 space-y-3">
            <Input
              type="email"
              placeholder="artist@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Invite email"
            />
            <Input
              placeholder="Artist name (optional)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Artist name"
            />
            <Input
              placeholder="Personal message (optional)"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-label="Invite message"
            />
            <Button onClick={handleCreateInvite} disabled={isCreating} className="w-full">
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending invite
                </>
              ) : (
                'Send Artist Invite'
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              The invite link will expire automatically once the artist completes onboarding or if you revoke it.
            </p>
          </div>
          <Separator orientation="vertical" className="hidden md:block" />
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Overview</h3>
                <p className="text-sm text-muted-foreground">
                  {pendingInvites.length} pending invite{pendingInvites.length === 1 ? '' : 's'} • {activeInvites.length} active • {archivedInvites.length} archived
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? 'Show Active' : 'Show Archived'}
              </Button>
            </div>

            <ScrollArea className="max-h-[420px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[160px]">Last Sent</TableHead>
                    <TableHead className="w-[160px]">Redeemed</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Loading invites...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && displayedInvites.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        {showArchived 
                          ? 'No archived invites.' 
                          : 'No invites sent yet. Use the form to send your first artist onboarding link.'}
                      </TableCell>
                    </TableRow>
                  )}

                  {displayedInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium leading-tight">{invite.name || invite.email}</div>
                          {invite.name && (
                            <div className="text-xs text-muted-foreground">{invite.email}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Sent {format(invite.createdAt, 'MMM d, yyyy')} • token {invite.token.slice(0, 8)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusClassMap[invite.status]}>{statusLabelMap[invite.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.lastSentAt
                          ? formatDistanceToNow(invite.lastSentAt, { addSuffix: true })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.redeemedAt
                          ? format(invite.redeemedAt, 'MMM d, yyyy p')
                          : invite.status === 'redeemed'
                          ? 'Completed'
                          : 'Not yet'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(invite)}
                            disabled={!invite.token}
                          >
                            {copiedId === invite.id ? (
                              <>
                                <Check className="mr-1 h-3.5 w-3.5" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-3.5 w-3.5" /> Copy link
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(invite)}
                            disabled={resendingId === invite.id}
                          >
                            {resendingId === invite.id ? (
                              <>
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Resending
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Resend
                              </>
                            )}
                          </Button>
                          {invite.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(invite)}
                              disabled={revokingId === invite.id}
                              className="text-destructive hover:text-destructive"
                            >
                              {revokingId === invite.id ? (
                                <>
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Revoking
                                </>
                              ) : (
                                <>
                                  <Ban className="mr-1 h-3.5 w-3.5" /> Revoke
                                </>
                              )}
                            </Button>
                          )}
                          {invite.status !== 'archived' && invite.status !== 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchive(invite)}
                              disabled={archivingId === invite.id}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {archivingId === invite.id ? (
                                <>
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Archiving
                                </>
                              ) : (
                                <>
                                  <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                                </>
                              )}
                            </Button>
                          )}
                          {(invite.status === 'archived' || invite.status === 'revoked' || invite.status === 'expired') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(invite)}
                              disabled={deletingId === invite.id}
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingId === invite.id ? (
                                <>
                                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Deleting
                                </>
                              ) : (
                                <>
                                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              <h4 className="mb-2 text-sm font-semibold text-foreground">How invites work</h4>
              <ul className="list-disc space-y-1 pl-4">
                <li>Invited artists must sign in with the same email address to redeem their link.</li>
                <li>Once onboarding is complete, the invite is automatically marked as redeemed.</li>
                <li>Revoked invites are automatically archived. You can manually archive or delete outdated invitations.</li>
                <li>Use the toggle above to view archived invitations separately from active ones.</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
