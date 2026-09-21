// What can be edited inside a storefront section: the list the section's "edit" dialog shows. Each item groups
// the settings that belong together (for the header: name/tagline/logo, and the menu). Sections without an entry
// have no edit dialog yet.
export type EditItemIcon = "identity" | "menu";
export type EditItem = { id: string; title: string; description: string; icon: EditItemIcon };

const editItems: Record<string, EditItem[]> = {
  HEADER: [
    { id: "identity", title: "نام، شعار و لوگو", description: "برای ویرایش نام، شعار و لوگو کلیک کنید.", icon: "identity" },
    { id: "menu", title: "منو", description: "برای ویرایش منو کلیک کنید.", icon: "menu" },
  ],
};

export function sectionEditItems(sectionId: string): EditItem[] | null {
  return editItems[sectionId] ?? null;
}
