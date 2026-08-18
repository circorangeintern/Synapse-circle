
import { AnimatePresence, motion } from "framer-motion";
import { navLinks } from "./navLinks";
import Link from "@/components/ui/Link"

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  const scrollToSection = (id: string) => {
    onClose();

    requestAnimationFrame(() => {
      const section = document.getElementById(id);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -25 }}
          transition={{ duration: 0.25 }}
          className="absolute left-0 top-full w-full border-t border-slate-200 bg-white shadow-lg lg:hidden px-4"
        >
          <nav className="container mx-auto flex flex-col py-8">
            <ul className="flex flex-col gap-4 text-sm text-neutral-900 font-medium ">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.sectionId)}
                    className="transition-colors duration-300 block py-2.5 px-4 rounded-lg w-full text-left hover:bg-brand-100 hover:text-primary hover:font-bold -mx-2.5
                    "
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/auth/login"
                onClick={onClose}
                variant="secondary"

              >
                Log in
              </Link>

              <Link
                to="/signup"
                onClick={onClose}
              >
                Get Started
              </Link>
            </div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileNav;
