type DeletionClient = {
  rpc: (name: "delete_unit", args: { _unit_id: string }) => PromiseLike<{ error: { message: string } | null }>;
};

export async function deleteRegisteredUnit(client: DeletionClient, unitId: string) {
  const { error } = await client.rpc("delete_unit", { _unit_id: unitId });
  if (error) throw new Error(error.message);
}