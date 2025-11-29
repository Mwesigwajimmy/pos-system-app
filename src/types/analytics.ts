export interface JobTypeCount {
  type: string;
  count: number;
}

export interface KPIAnalyticsData {
  slaMet: number;
  firstTimeFixRate: number;
  averageTimeToClose: number; // in hours
  onTimeArrivals: number;
  cancelRate: number;
  jobsByType: JobTypeCount[];
  travelVsLabor: number;
}