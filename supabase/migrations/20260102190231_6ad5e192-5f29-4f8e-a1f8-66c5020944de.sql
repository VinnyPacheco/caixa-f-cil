-- Create a table to store exceptions for recurring transactions
-- This allows users to modify or skip specific instances of recurring transactions
CREATE TABLE public.recurring_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  parent_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('skip', 'modified')),
  -- For modified exceptions, store the modified values
  modified_amount NUMERIC NULL,
  modified_description TEXT NULL,
  modified_category_id UUID NULL,
  modified_account_id UUID NULL,
  modified_is_paid BOOLEAN NULL,
  modified_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure only one exception per parent transaction per date
  UNIQUE(parent_id, exception_date)
);

-- Enable Row Level Security
ALTER TABLE public.recurring_exceptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own recurring exceptions" 
ON public.recurring_exceptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring exceptions" 
ON public.recurring_exceptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring exceptions" 
ON public.recurring_exceptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring exceptions" 
ON public.recurring_exceptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recurring_exceptions_updated_at
BEFORE UPDATE ON public.recurring_exceptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add an end_date column to transactions for "this and future" deletion
ALTER TABLE public.transactions ADD COLUMN end_date DATE NULL;