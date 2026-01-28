import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that automatically settles transactions with auto_settle = true
 * when their date has passed. Runs once when the app loads.
 */
export function useAutoSettle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once per session and when user is authenticated
    if (!user || hasRun.current) return;
    hasRun.current = true;

    const runAutoSettle = async () => {
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        console.log('[AutoSettle] Checking for transactions to auto-settle...');
        
        // Find transactions that need to be auto-settled
        // - auto_settle = true
        // - date < today (past due)
        // - is_paid = false
        const { data: transactionsToSettle, error: fetchError } = await supabase
          .from('transactions')
          .select('id, description, date')
          .eq('auto_settle', true)
          .eq('is_paid', false)
          .lt('date', today);
        
        if (fetchError) {
          console.error('[AutoSettle] Error fetching transactions:', fetchError);
          return;
        }
        
        if (!transactionsToSettle || transactionsToSettle.length === 0) {
          console.log('[AutoSettle] No transactions to auto-settle');
          return;
        }
        
        console.log(`[AutoSettle] Found ${transactionsToSettle.length} transactions to settle`);
        
        // Update all matching transactions to is_paid = true
        const transactionIds = transactionsToSettle.map(t => t.id);
        
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ is_paid: true })
          .in('id', transactionIds);
        
        if (updateError) {
          console.error('[AutoSettle] Error updating transactions:', updateError);
          return;
        }
        
        console.log(`[AutoSettle] Successfully auto-settled ${transactionIds.length} transactions`);
        transactionsToSettle.forEach(t => {
          console.log(`  - ${t.description} (date: ${t.date})`);
        });
        
        // Invalidate transactions query to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        
      } catch (error) {
        console.error('[AutoSettle] Unexpected error:', error);
      }
    };

    // Run auto-settle check
    runAutoSettle();
  }, [user, queryClient]);
}
