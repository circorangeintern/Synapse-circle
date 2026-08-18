import { cn } from "@/utils";
import { getInitials } from "@/utils/getInitials"

interface HeaderProps {
  title: string;
  caption: string;
  name?: string;
  className?: string;
  imageUrl?: string | null

}




function Header({ title, caption, name, imageUrl, className }: HeaderProps) {
  return (
    <div className="flex flex-row justify-between items-center sticky bg-neutral-50 w-full p-4 top-0 z-50">
      <div className={cn("flex flex-col", className)}>
        {caption && <p className="font-medium text-neutral-700">{caption} {name?.split(" ")[0]}</p>}
        <h2 className="text-neutral-900 font-bold text-2xl">{title}</h2>
      </div>
      {imageUrl && <div className="size-10 bg-brand-200 rounded-full flex aspect-video overflow-hidden justify-center items-center">
        {imageUrl ? <img src={`${imageUrl}`} alt="user profile pictures" className="w-full object cover h-full" /> : <p className="font-bold text-brand-500">{name && getInitials(name!)}</p>}
      </div>}
    </div>
  )
}

export default Header
