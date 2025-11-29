"use client";

import React, { useEffect, useState } from 'react';
import { activityService, WorkflowStep } from '@/services/activityService';
import { CheckCircle, Loader2, Clock, XCircle, SkipForward } from 'lucide-react';

interface Props {
  workflowId: string;
}

export default function WorkflowActivityLog({ workflowId }: Props) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workflowId) { 
      setLoading(false); 
      return; 
    }
    
    const fetchWorkflow = async () => {
      try {
        setLoading(true);
        const data = await activityService.getWorkflowSteps(workflowId);
        setSteps(data);
      } catch (e) { 
        console.error("Failed to load workflow:", e); 
      } finally { 
        setLoading(false); 
      }
    };

    fetchWorkflow();
  }, [workflowId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex justify-center items-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600"/>
        <span className="ml-2 text-sm text-gray-500">Loading workflow status...</span>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-400 text-sm">
        No workflow data available for ID: {workflowId}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-900">Approval Workflow</h3>
        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
            ID: {workflowId}
        </span>
      </div>

      <div className="relative">
        {/* Connecting Line */}
        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-100 -z-10 hidden sm:block" />
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'approved';
            const isRejected = step.status === 'rejected';
            const isCurrent = step.status === 'pending';
            const isSkipped = step.status === 'skipped';
            
            return (
              <div key={step.id} className="flex flex-row sm:flex-col items-center gap-4 sm:gap-0 sm:text-center bg-white sm:bg-transparent">
                {/* Status Indicator Bubble */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 transition-all z-10 bg-white shrink-0
                  ${isCompleted ? 'border-green-500 text-green-500 bg-green-50' : ''}
                  ${isRejected ? 'border-red-500 text-red-500 bg-red-50' : ''}
                  ${isCurrent ? 'border-blue-600 text-blue-600 ring-4 ring-blue-50' : ''}
                  ${isSkipped ? 'border-gray-300 text-gray-300 border-dashed' : ''}
                  ${!isCompleted && !isRejected && !isCurrent && !isSkipped ? 'border-gray-200 text-gray-400' : ''}
                `}>
                  {isCompleted && <CheckCircle className="w-5 h-5" />}
                  {isRejected && <XCircle className="w-5 h-5" />}
                  {isCurrent && <Clock className="w-4 h-4 animate-pulse" />}
                  {isSkipped && <SkipForward className="w-4 h-4" />}
                  {!isCompleted && !isRejected && !isCurrent && !isSkipped && <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                
                {/* Text Content */}
                <div className="text-left sm:text-center">
                    <h4 className="text-sm font-bold text-gray-900">{step.step_name}</h4>
                    <p className="text-xs text-gray-500 mb-1">{step.approver_role}</p>
                    
                    {step.actioned_at ? (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(step.actioned_at).toLocaleDateString()}
                            </span>
                            {step.actioned_by && <span className="text-[10px] text-gray-400">by {step.actioned_by.slice(0,8)}...</span>}
                        </div>
                    ) : (
                        <span className="text-[10px] text-gray-300 italic">Pending action</span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}