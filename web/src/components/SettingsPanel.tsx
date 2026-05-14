import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { DEFAULTS } from '@/constants/apiConstants';
import { useSettings } from '@/hooks/useSettings';

export function SettingsPanel() {
  const { settings, update, reset } = useSettings();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure scripture matching and display preferences.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="preferred-version">Preferred Bible version</Label>
            <select
              id="preferred-version"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={settings.preferredVersion}
              onChange={(e) => update({ preferredVersion: e.target.value })}
            >
              {DEFAULTS.bibleVersions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Best match across all versions, weighted toward your choice.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Minimum confidence</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {(settings.minConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[settings.minConfidence]}
              onValueChange={(v) => update({ minConfidence: v[0] })}
            />
            <p className="text-xs text-muted-foreground">
              Hide scripture suggestions below this confidence.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-scroll">Auto-scroll transcript</Label>
              <p className="text-xs text-muted-foreground">Keep latest text in view</p>
            </div>
            <Switch
              id="auto-scroll"
              checked={settings.autoScroll}
              onCheckedChange={(checked) => update({ autoScroll: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-confidence">Show confidence badges</Label>
              <p className="text-xs text-muted-foreground">Display % on each match card</p>
            </div>
            <Switch
              id="show-confidence"
              checked={settings.showConfidence}
              onCheckedChange={(checked) => update({ showConfidence: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset to defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
