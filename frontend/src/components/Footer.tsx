import Logo from "./navigation/Logo"
import PrivacyPolicy from "./PrivacyPolicy";
import TermsCondition from "./TermsCondition";



function Footer() {
  return (
    <footer className="px-6 py-4 text-sm text-default space-y-4 border-t border-t-neutral-200 -mx-4 lg:flex lg:items-center lg:justify-between">
      <Logo />
      <p className="">© 2026 SafeWalk Campus. Built for student safety.</p>
      <div className="font-medium  flex items-center gap-6 pt-2 pb-6">
        <PrivacyPolicy className="hover:cursor-pointer" />
        <TermsCondition className="hover:cursor-pointer" />
        <a className="hover:cursor-pointer">Support</a>


      </div>
    </footer>
  )
}

export default Footer;
