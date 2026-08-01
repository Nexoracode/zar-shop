"use client";

import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

type Faq = { id: string; question: string; answer: string };

export function StorefrontFaqAccordion({ faqs }: { faqs: Faq[] }) {
  return <Accordion dir="rtl" variant="surface" hideSeparator className="rounded-2xl border border-[#e5dfd4] bg-[#fbfaf7] px-4 text-right" aria-label="سوالات متداول فروشگاه">
    {faqs.map((faq) => <Accordion.Item key={faq.id} id={faq.id} className="border-b border-[#e5dfd4] last:border-b-0"><Accordion.Heading><Accordion.Trigger className="flex w-full items-center justify-between gap-4 py-5 text-right text-sm font-bold text-[var(--brand-primary)]"><span>{faq.question}</span><Accordion.Indicator><ChevronDown size={17} /></Accordion.Indicator></Accordion.Trigger></Accordion.Heading><Accordion.Panel><Accordion.Body className="pb-5 text-right text-sm leading-8 text-[#747982]">{faq.answer}</Accordion.Body></Accordion.Panel></Accordion.Item>)}
  </Accordion>;
}
