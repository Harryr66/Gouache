'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Database, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MigrationStats {
  totalFound: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

interface MigrationStatus {
  needsMigration: number;
  alreadyMigrated: number;
  total: number;
}

export default function MigratePage() {
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [limit, setLimit] = useState<number | undefined>(undefined);
  const [deleteAfterMigration, setDeleteAfterMigration] = useState(false);

  const checkStatus = async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch('/api/migrate/cloudflare');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to check migration status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check migration status',
        variant: 'destructive',
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const startMigration = async () => {
    setMigrating(true);
    setStats(null);
    
    try {
      const response = await fetch('/api/migrate/cloudflare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchSize,
          deleteAfterMigration,
          limit: limit || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        toast({
          title: 'Migration Complete',
          description: data.message,
        });
        // Refresh status
        await checkStatus();
      } else {
        toast({
          title: 'Migration Failed',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration Failed',
        description: 'An error occurred during migration',
        variant: 'destructive',
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firebase to Cloudflare Migration
          </CardTitle>
          <CardDescription>
            Migrate media files from Firebase Storage to Cloudflare (Stream for videos, Images for images)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Check */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Migration Status</h3>
              <Button
                variant="outline"
                onClick={checkStatus}
                disabled={loadingStatus}
              >
                {loadingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Status'
                )}
              </Button>
            </div>

            {status && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Needs Migration</div>
                  <div className="text-2xl font-bold">{status.needsMigration}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Already Migrated</div>
                  <div className="text-2xl font-bold text-green-600">{status.alreadyMigrated}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Artworks</div>
                  <div className="text-2xl font-bold">{status.total}</div>
                </div>
              </div>
            )}
          </div>

          {/* Migration Settings */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Migration Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="50"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                disabled={migrating}
              />
              <p className="text-xs text-muted-foreground">
                Number of items to process in parallel (1-50)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Limit (Optional)</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={migrating}
                placeholder="No limit"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of items to migrate (leave empty for all)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="deleteAfter"
                checked={deleteAfterMigration}
                onCheckedChange={(checked) => setDeleteAfterMigration(checked === true)}
                disabled={migrating}
              />
              <Label htmlFor="deleteAfter" className="cursor-pointer">
                Delete from Firebase Storage after successful migration
              </Label>
            </div>
          </div>

          {/* Start Migration */}
          <Button
            onClick={startMigration}
            disabled={migrating || (status && status.needsMigration === 0)}
            className="w-full"
            size="lg"
          >
            {migrating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              'Start Migration'
            )}
          </Button>

          {/* Migration Results */}
          {stats && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">Migration Results</h3>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Found</div>
                  <div className="text-2xl font-bold">{stats.totalFound}</div>
                </div>
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Migrated
                  </div>
                  <div className="text-2xl font-bold text-green-600">{stats.migrated}</div>
                </div>
                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                </div>
                <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Skipped
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
                </div>
              </div>

              {stats.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Errors:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {stats.errors.map((error, index) => (
                      <div key={index} className="text-xs p-2 bg-red-50 dark:bg-red-950 rounded">
                        <strong>{error.id}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

