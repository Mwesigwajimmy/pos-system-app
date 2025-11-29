'use client';

import * as React from "react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, GitMerge, Trash2, Smartphone } from "lucide-react";

export function USSDTreeBuilder({ tenantId }: { tenantId: string }) {
  const [code, setCode] = useState("*100#");
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState('');

  const handleAddStep = () => { 
      if (!currentStep.trim()) return;
      setSteps([...steps, currentStep]); 
      setCurrentStep(''); 
      toast.success("Menu step added");
  };

  const handleRemoveStep = (index: number) => {
      setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSaveFlow = () => {
      // Logic to save JSON structure to DB would go here
      toast.success("USSD Flow Saved Successfully");
  };

  return (
    <Card className="h-full border-t-4 border-t-cyan-600 shadow-sm">
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-600"/> USSD / IVR Flow Builder
          </CardTitle>
          <CardDescription>Design dynamic menu structures for *123# services.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Base Code Input */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Service Shortcode</label>
            <Input 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                placeholder="e.g. *144#" 
                className="font-mono text-lg bg-slate-50 border-slate-300"
            />
        </div>

        {/* Step Builder */}
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Add Menu Step</label>
            <div className="flex gap-2">
                <Input 
                    value={currentStep} 
                    onChange={e => setCurrentStep(e.target.value)} 
                    placeholder="e.g. '1. Check Balance' or 'Enter PIN'" 
                />
                <Button onClick={handleAddStep} disabled={!currentStep}>
                    <Plus className="w-4 h-4 mr-2"/> Add
                </Button>
            </div>
        </div>

        {/* Visual Flow */}
        <div className="border rounded-lg bg-slate-50 p-4 min-h-[200px]">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4">
                <div className="bg-cyan-100 p-2 rounded text-cyan-800 font-mono">{code}</div>
                <div className="h-px bg-slate-300 w-8"></div>
                <div className="text-xs text-slate-400 uppercase">Start</div>
            </div>

            <div className="pl-8 border-l-2 border-slate-200 ml-4 space-y-4">
                {steps.length === 0 ? (
                    <div className="text-sm text-slate-400 italic py-2">No steps defined yet.</div>
                ) : (
                    steps.map((step, idx) => (
                        <div key={idx} className="relative group">
                            <div className="absolute -left-[34px] top-3 w-8 h-px bg-slate-300"></div>
                            <div className="bg-white p-3 rounded shadow-sm border flex justify-between items-center">
                                <span className="font-mono text-xs text-slate-400 mr-3">Step {idx + 1}</span>
                                <span className="font-medium text-slate-700 flex-1">{step}</span>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-6 w-6 text-slate-300 hover:text-red-500"
                                    onClick={() => handleRemoveStep(idx)}
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </div>
                            {idx < steps.length - 1 && (
                                <div className="absolute left-[-34px] h-full w-[2px] bg-slate-200"></div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="pt-2 border-t flex justify-end">
            <Button onClick={handleSaveFlow} className="bg-cyan-600 hover:bg-cyan-700 text-white" disabled={steps.length === 0}>
                <GitMerge className="w-4 h-4 mr-2"/> Save Workflow
            </Button>
        </div>

      </CardContent>
    </Card>
  )
}