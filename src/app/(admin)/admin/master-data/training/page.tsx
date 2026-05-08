import {
  getTrainingActivities,
  getFarmerGroupsForDropdown,
  getTrainingPackagesForDropdown,
} from "@/server/actions/training";
import { TrainingListClient } from "./training-list-client";

export const metadata = { title: "Master Data Training" };

export default async function TrainingPage() {
  const [activitiesResult, groupsResult, packagesResult] = await Promise.all([
    getTrainingActivities(),
    getFarmerGroupsForDropdown(),
    getTrainingPackagesForDropdown(),
  ]);

  return (
    <div className="p-6">
      <TrainingListClient
        initialActivities={activitiesResult.success ? (activitiesResult.data ?? []) : []}
        farmerGroups={groupsResult.success ? (groupsResult.data ?? []) : []}
        trainingPackages={packagesResult.success ? (packagesResult.data ?? []) : []}
      />
    </div>
  );
}
