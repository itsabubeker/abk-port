"use client";
import { Loader } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { sendMainAction } from "@/action/sendMailAction";
import {
  CONTACT_LIMITS,
  type ContactData,
  EMPTY_CONTACT,
  normalizeContactData,
  validateContactData,
} from "@/lib/contact";
import { SITE } from "@/lib/site";

const StyledAstrix = () => <span className="text-sky-400">*</span>;

interface ContactMeFormProps {
  className?: string;
}
const ContactMeForm = ({ className }: ContactMeFormProps) => {
  const [formData, setFormData] = useState<ContactData>(EMPTY_CONTACT);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sendContactData = async (contactData: ContactData) => {
    setIsLoading(true);

    try {
      const result = await sendMainAction(contactData);
      if (!result.success) {
        // Keep what they typed so they can retry or copy it elsewhere.
        toast.error("Message not sent", { description: result.error });
        return;
      }
      setFormData(EMPTY_CONTACT);
      toast.success("Message sent successfully!");
    } catch (err: unknown) {
      // Network failure or server crash before the action could respond.
      console.error(err);
      toast.error("Message not sent", {
        description: `Something went wrong. Please try again or email me at ${SITE.author.email}.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = normalizeContactData(formData);
    const validationError = validateContactData(data);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    await sendContactData(data);
  };

  return (
    <form
      className={cn(
        "bg-transparent relative z-10 rounded-xs p-6 w-full md:w-1/2 border h-fit",
        className,
      )}
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-6">
        <div className="flex w-full gap-6">
          <div className="flex w-full flex-col gap-3">
            <label className="text-sm font-medium ">
              Full Name <StyledAstrix />
            </label>
            <Input
              className={cn("w-full rounded-xs")}
              placeholder="Eg, john doe"
              value={formData.full_name}
              required
              maxLength={CONTACT_LIMITS.full_name}
              autoComplete="name"
              name="full_name"
              onChange={handleChange}
            />
          </div>
          <div className="flex w-full flex-col gap-3">
            <label className="text-sm font-medium ">
              Email <StyledAstrix />
            </label>
            <Input
              className={cn("w-full rounded-xs")}
              type="email"
              placeholder="Example@email.com"
              required
              maxLength={CONTACT_LIMITS.email}
              autoComplete="email"
              value={formData.email}
              name="email"
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium ">
            Country <StyledAstrix />
          </label>
          <Input
            className={cn("w-full rounded-xs")}
            placeholder="Eg, United kingdom"
            value={formData.country}
            name="country"
            required
            maxLength={CONTACT_LIMITS.country}
            autoComplete="country-name"
            onChange={handleChange}
          />
        </div>
        {/* Honeypot: invisible to people and screen readers. autoComplete is
            off so browser autofill can't fill it and get a real visitor's
            message silently discarded as spam. */}
        <div className="hidden" aria-hidden="true">
          <label>
            Company
            <Input
              value={formData.company}
              tabIndex={-1}
              autoComplete="off"
              name="company"
              onChange={handleChange}
            />
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium ">
            Subject <StyledAstrix />
          </label>

          <Input
            className={cn("w-full mt-2 rounded-xs")}
            placeholder="Please specify your subject"
            value={formData.subject}
            required
            maxLength={CONTACT_LIMITS.subject}
            name="subject"
            onChange={handleChange}
          />
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium  ">
            Description <StyledAstrix />
          </label>
          <Textarea
            className={cn("w-full rounded-xs", "h-20")}
            placeholder="Write your questions in detail to support your Subject..."
            value={formData.description}
            required
            maxLength={CONTACT_LIMITS.description}
            name="description"
            onChange={handleChange}
          />
        </div>
      </div>

      <Button
        className="mt-8 w-full h-11 rounded-xs"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? <Loader className="animate-spin" /> : " Send message"}
      </Button>
    </form>
  );
};

export default ContactMeForm;
