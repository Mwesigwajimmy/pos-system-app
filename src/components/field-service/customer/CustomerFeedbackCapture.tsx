'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { captureFeedback } from '@/lib/actions/feedback'; // Import Server Action

interface TenantContext {
  tenantId: string;
  country: string;
}

export default function CustomerFeedbackCapture({
  workOrderId,
  customerId,
  tenant,
}: {
  workOrderId: number;
  customerId: string;
  tenant: TenantContext;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const mutation = useMutation({
    mutationFn: () => captureFeedback(workOrderId, customerId, rating, comment, tenant.tenantId),
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      setRating(0);
      setComment('');
      // FIXED: v5 Syntax
      queryClient.invalidateQueries({ queryKey: ['work-order-feedback', workOrderId] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to submit feedback"),
  });

  const handleSubmit = () => {
    if (rating === 0) return toast.error('Please select a star rating');
    mutation.mutate();
  };

  return (
    <Card className="w-full max-w-md mx-auto border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>How did we do?</CardTitle>
        <CardDescription>Please rate the service provided for Work Order #{workOrderId}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating UI */}
        <div className="flex flex-col items-center justify-center space-y-2 py-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    (hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-muted text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
            {rating === 0 && "Select a rating"}
          </span>
        </div>

        <Textarea
          placeholder="Share details about your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[100px]"
        />

        <Button 
          className="w-full" 
          onClick={handleSubmit} 
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
}