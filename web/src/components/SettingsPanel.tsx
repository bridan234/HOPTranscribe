import { BookOpen, Mic, Monitor, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  DEFAULTS,
  MATCH_COUNT_MAX,
  MATCH_COUNT_MIN,
  SILENCE_SECONDS_MAX,
  SILENCE_SECONDS_MIN,
} from '@/constants/apiConstants';
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Tune transcription, scripture matching, and display.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-1">
          <Section icon={<Mic className="h-4 w-4" />} title="Transcription">
            <SliderRow
              label="Silence split delay"
              hint="Pause length that ends one transcript segment and starts the next."
              value={settings.silenceSeconds}
              min={SILENCE_SECONDS_MIN}
              max={SILENCE_SECONDS_MAX}
              step={0.5}
              format={(v) => `${v.toFixed(1)}s`}
              onChange={(v) => update({ silenceSeconds: v })}
            />
            <ToggleRow
              id="auto-scroll"
              label="Auto-scroll transcript"
              hint="Keep the newest segment in view while recording."
              checked={settings.autoScroll}
              onChange={(checked) => update({ autoScroll: checked })}
            />
          </Section>

          <Section icon={<BookOpen className="h-4 w-4" />} title="Scripture matching">
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

            <SliderRow
              label="Matches per segment"
              hint="Maximum scripture references suggested for each utterance."
              value={settings.matchCount}
              min={MATCH_COUNT_MIN}
              max={MATCH_COUNT_MAX}
              step={1}
              format={(v) => `${v}`}
              onChange={(v) => update({ matchCount: Math.round(v) })}
            />

            <SliderRow
              label="Minimum confidence"
              hint="Hide scripture suggestions below this confidence."
              value={settings.minConfidence}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => update({ minConfidence: v })}
            />
          </Section>

          <Section icon={<Monitor className="h-4 w-4" />} title="Display">
            <ToggleRow
              id="show-confidence"
              label="Show confidence badges"
              hint="Display the % match on each scripture card."
              checked={settings.showConfidence}
              onChange={(checked) => update({ showConfidence: checked })}
            />
          </Section>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset to defaults
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-indigo-500">{icon}</span>
        {title}
      </div>
      <div className="space-y-4 border-l pl-4">{children}</div>
    </section>
  );
}

function SliderRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
          {format(value)}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
