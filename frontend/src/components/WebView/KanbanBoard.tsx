import { Box } from "lucide-react";
import type { HealthStatus, Workspace } from "../../types";

interface KanbanBoardProps {
	workspaces: Workspace[];
}

const columns: { id: HealthStatus; label: string; color: string }[] = [
	{
		id: "running",
		label: "Running / Healthy",
		color: "border-green-500/50 bg-green-500/10 text-green-400",
	},
	{
		id: "unhealthy",
		label: "Warning / Fault",
		color: "border-amber-500/50 bg-amber-500/10 text-amber-400",
	},
	{
		id: "stopped",
		label: "Stopped",
		color: "border-gray-500/50 bg-gray-500/10 text-gray-400",
	},
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ workspaces }) => {
	return (
		<div className="h-full w-full bg-[#0f1115] text-gray-300 overflow-y-auto overflow-x-hidden p-6 font-sans">
			<div className="w-full">
				{/* Kanban Headers (Hidden on Mobile) */}
				<div className="hidden md:grid md:grid-cols-4 gap-4 mb-4 items-center">
					<div className="text-gray-500 uppercase tracking-widest text-xs font-bold pl-4">
						Workspaces
					</div>
					{columns.map((col) => (
						<div
							key={col.id}
							className={`p-2 rounded border border-dashed ${col.color} text-center text-sm font-semibold`}
						>
							{col.label}
						</div>
					))}
				</div>

				{/* Swimlanes */}
				<div className="space-y-6 md:space-y-4">
					{workspaces.map((ws) => (
						<div
							key={ws.name}
							className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#16191f] border border-gray-800 rounded-lg p-4"
						>
							{/* Swimlane Label */}
							<div className="flex flex-col justify-center border-b border-gray-800 md:border-none pb-3 md:pb-0 mb-2 md:mb-0">
								<h3
									className="font-bold text-gray-200 truncate"
									title={ws.name}
								>
									{ws.name}
								</h3>
								<span className="text-xs text-gray-500 capitalize">
									{ws.type}
								</span>
								<div className="mt-2 text-xs text-gray-400">
									{ws.runningCount} / {ws.totalCount} Running
								</div>
							</div>

							{/* Columns for this workspace */}
							{columns.map((col) => {
								const colContainers = ws.containers.filter(
									(c) => c.healthStatus === col.id,
								);
								return (
									<div
										key={col.id}
										className="flex flex-col gap-2 min-h-[80px] bg-[#0a0c0f] rounded p-3 md:p-2 border border-gray-900/50"
									>
                    {/* Mobile Column Label */}
                    <div className="md:hidden text-xs font-bold mb-2 uppercase text-gray-400 tracking-wider">
                      {col.label}
                    </div>
										{colContainers.map((c) => (
											<div
												key={c.id}
												className="bg-gray-800 p-2.5 rounded shadow-sm border border-gray-700 hover:border-gray-500 transition-colors cursor-default"
											>
												<div className="flex items-center gap-2 mb-1">
													<Box size={14} className="text-gray-400 shrink-0" />
													<span
														className="text-sm font-medium text-gray-200 truncate"
														title={c.name}
													>
														{c.name || c.id.substring(0, 12)}
													</span>
												</div>
												<div
													className="text-[10px] text-gray-500 truncate"
													title={c.image}
												>
													{c.image}
												</div>
											</div>
										))}
										{colContainers.length === 0 && (
											<div className="flex-1 flex items-center justify-center text-gray-700 text-xs italic py-2 md:py-0">
												Empty
											</div>
										)}
									</div>
								);
							})}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
