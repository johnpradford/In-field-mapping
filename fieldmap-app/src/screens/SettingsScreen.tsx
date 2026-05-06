import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import ScreenHeader from '@/components/ScreenHeader';

/**
 * App settings. Mirrors SettingsView.swift.
 *
 * Uses the Capacitor Preferences plugin so values survive app
 * restarts. Add new settings here as the app grows.
 */
export default function SettingsScreen() {
  const [coordFormat, setCoordFormat] = useState<'decimal' | 'dms'>('decimal');
  const [distanceUnit, setDistanceUnit] = useState<'metric' | 'imperial'>('metric');

  useEffect(() => {
    Preferences.get({ key: 'coordFormat' }).then((r) =>
      setCoordFormat((r.value as 'decimal' | 'dms') ?? 'decimal'),
    );
    Preferences.get({ key: 'distanceUnit' }).then((r) =>
      setDistanceUnit((r.value as 'metric' | 'imperial') ?? 'metric'),
    );
  }, []);

  function update<K extends string>(key: string, value: K, setter: (v: K) => void) {
    setter(value);
    Preferences.set({ key, value });
  }

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader title="Settings" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <Group title="Coordinate format">
          <Choice
            label="Decimal (-23.355, 119.733)"
            checked={coordFormat === 'decimal'}
            onPress={() => update('coordFormat', 'decimal', setCoordFormat)}
          />
          <Choice
            label="Degrees / Minutes / Seconds"
            checked={coordFormat === 'dms'}
            onPress={() => update('coordFormat', 'dms', setCoordFormat)}
          />
        </Group>

        <Group title="Units">
          <Choice
            label="Metric (metres, km)"
            checked={distanceUnit === 'metric'}
            onPress={() => update('distanceUnit', 'metric', setDistanceUnit)}
          />
          <Choice
            label="Imperial (feet, miles)"
            checked={distanceUnit === 'imperial'}
            onPress={() => update('distanceUnit', 'imperial', setDistanceUnit)}
          />
        </Group>

        <Group title="About">
          <Row label="Version" value="0.1.0 (dev)" />
          <Row label="Client" value="Biologic Environmental" />
        </Group>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl divide-y divide-greylight overflow-hidden">
      <div className="px-4 pt-3 pb-2 text-xs font-semibold text-teal-mid uppercase tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}

function Choice({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-greylight"
    >
      <span className="text-teal-dark">{label}</span>
      {checked && <span className="text-accent font-semibold">✓</span>}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-teal-dark">{label}</span>
      <span className="text-teal-mid">{value}</span>
    </div>
  );
}
