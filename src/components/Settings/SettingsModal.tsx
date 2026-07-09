/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

type SettingsSection = 'general' | 'preferences';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sections: { id: SettingsSection; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'preferences', label: 'Preferences' },
];

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const { theme, setTheme } = useTheme();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Settings"
      contentClassName="sm:max-w-[60vw] h-[60vh] flex flex-col"
    >
      <div className="flex flex-1 min-h-0 -mx-6 -mb-4 mt-2">
        <aside className="w-48 shrink-0 border-r border-border pt-2 pb-4">
          <nav className="flex flex-col gap-0.5 px-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === s.id
                    ? 'bg-primary-subtle text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-h-0 p-6 pt-2">
          {activeSection === 'general' && (
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-4">General</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary">Language</p>
                    <p className="text-xs text-text-secondary">Application interface language</p>
                  </div>
                  <div className="w-40">
                    <Select
                      value="en"
                      onChange={() => {}}
                      options={[{ value: 'en', label: 'English' }]}
                      placeholder="Select language"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'preferences' && (
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary">Theme</p>
                    <p className="text-xs text-text-secondary">Choose your preferred appearance</p>
                  </div>
                  <div className="w-40">
                    <Select
                      value={theme}
                      onChange={(v) => setTheme(v as 'light' | 'dark' | 'black' | 'system')}
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'black', label: 'Black' },
                        { value: 'system', label: 'System' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}