import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`Processing auto-settle for transactions with date < ${today}`);
    
    // Find all transactions that:
    // - Have auto_settle = true
    // - Have date < today (past due)
    // - Are not yet paid (is_paid = false)
    // - Are single transactions (recurrence_type = 'once') OR
    //   Are the parent recurring transaction
    const { data: transactionsToSettle, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description, date, user_id')
      .eq('auto_settle', true)
      .eq('is_paid', false)
      .lt('date', today);
    
    if (fetchError) {
      console.error('Error fetching transactions:', fetchError);
      throw fetchError;
    }
    
    console.log(`Found ${transactionsToSettle?.length || 0} transactions to auto-settle`);
    
    if (!transactionsToSettle || transactionsToSettle.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No transactions to auto-settle',
          count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    // Update all matching transactions to is_paid = true
    const transactionIds = transactionsToSettle.map(t => t.id);
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ is_paid: true })
      .in('id', transactionIds);
    
    if (updateError) {
      console.error('Error updating transactions:', updateError);
      throw updateError;
    }
    
    console.log(`Successfully auto-settled ${transactionIds.length} transactions`);
    
    // Log the settled transactions for debugging
    transactionsToSettle.forEach(t => {
      console.log(`  - ${t.description} (date: ${t.date}, id: ${t.id})`);
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto-settled ${transactionIds.length} transactions`,
        count: transactionIds.length,
        transactions: transactionsToSettle.map(t => ({
          id: t.id,
          description: t.description,
          date: t.date
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-settle error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
