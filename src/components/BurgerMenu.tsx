import { useState } from 'react';
import { Menu, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ConfigPage } from './ConfigPage';

export const BurgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </SheetTitle>
          </div>
        </SheetHeader>
        <div className="mt-6">
          <ConfigPage onClose={() => setIsOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
};