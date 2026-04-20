'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControl, Form, FormField, FormItem, FormMessage } from '@/components/Form';
import RichTextEditor from '@/components/RichTextEditor';

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
}

// Validation schema (remains unchanged)
const formSchema = z.object({
  post: z.string().min(5, { message: "The text must be at least 5 characters long" }),
});

const Editor: React.FC<EditorProps> = ({ content, onChange }) => {
  const form = useForm({
    mode: 'onTouched',
    resolver: zodResolver(formSchema),
    defaultValues: { post: content },
  });

  // Sync external changes with the form
  useEffect(() => {
    console.log("Content:", content);
    
    form.setValue("post", content);
  }, [content, form]);

  return (
    <div className="max-w-full mx-auto py-5">
      <Form {...form}>
        <form>
          <FormField
            control={form.control}
            name="post"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RichTextEditor
                    content={field.value}
                    onChange={(value: string) => {
                      field.onChange(value);
                      onChange(value); // Update parent state
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
};

export default Editor;