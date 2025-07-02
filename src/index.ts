import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DurableObjectState } from "cloudflare:durable-objects";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Heygen MCP",
		version: "1.0.0",
	});

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.init(env.HEYGEN_API_KEY);
	}

	async init(heygenApiKey: string) {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }: { a: number; b: number }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }: { operation: string; a: number; b: number }) => {
				let result: number = 0;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);

		// HeyGen video creation tool
		this.server.tool(
			"create_heygen_video",
			{
				avatar_id: z.string(),
				voice_id: z.string(),
				input_text: z.string(),
				background: z.string().optional(), // e.g., "#008000"
			},
			async (
				{
					avatar_id,
					voice_id,
					input_text,
					background,
				}: { avatar_id: string; voice_id: string; input_text: string; background?: string }
			) => {
				const HEYGEN_API_KEY = heygenApiKey;
				const body = {
					video_inputs: [
						{
							character: {
								type: "avatar",
								avatar_id,
								avatar_style: "normal",
							},
							voice: {
								type: "text",
								input_text,
								voice_id,
							},
							background: background
								? { type: "color", value: background }
								: undefined,
						},
					],
					dimension: {
						width: 1280,
						height: 720,
					},
				};
				try {
					const response = await fetch("https://api.heygen.com/v2/video/generate", {
						method: "POST",
						headers: {
							"X-Api-Key": HEYGEN_API_KEY,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(body),
					});
					if (!response.ok) {
						const errorText = await response.text();
						return {
							content: [
								{
									type: "text",
									text: `HeyGen API error: ${response.status} ${errorText}`,
								},
							],
						};
					}
					const data = (await response.json()) as any;
					if (data.error) {
						return {
							content: [
								{
									type: "text",
									text: `HeyGen API error: ${JSON.stringify(data.error)}`,
								},
							],
						};
					}
					return {
						content: [
							{
								type: "text",
								text: `HeyGen video created! video_id: ${data.data.video_id}`,
							},
						],
					};
				} catch (err) {
					return {
						content: [
							{
								type: "text",
								text: `Request failed: ${err}`,
							},
						],
					};
				}
			}
		);
	}

	async fetch(request: Request): Promise<Response> {
		// Handle MCP protocol requests
		const url = new URL(request.url);
		
		// For SSE endpoints, use the parent class implementation
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return super.fetch(request);
		}

		// MCP protocol endpoints
		if (url.pathname === "/mcp") {
			// Return server info
			return new Response(JSON.stringify({
				name: "Heygen MCP",
				version: "1.0.0",
				capabilities: {
					tools: {}
				}
			}), {
				headers: { "Content-Type": "application/json" }
			});
		}

		if (url.pathname === "/mcp/tools") {
			// Return available tools
			return new Response(JSON.stringify({
				tools: [
					{
						name: "add",
						description: "Add two numbers together",
						inputSchema: {
							type: "object",
							properties: {
								a: { type: "number", description: "First number" },
								b: { type: "number", description: "Second number" }
							},
							required: ["a", "b"]
						}
					},
					{
						name: "calculate",
						description: "Perform mathematical operations on two numbers",
						inputSchema: {
							type: "object",
							properties: {
								operation: { 
									type: "string", 
									enum: ["add", "subtract", "multiply", "divide"],
									description: "Mathematical operation to perform"
								},
								a: { type: "number", description: "First number" },
								b: { type: "number", description: "Second number" }
							},
							required: ["operation", "a", "b"]
						}
					},
					{
						name: "create_heygen_video",
						description: "Create a video using HeyGen API",
						inputSchema: {
							type: "object",
							properties: {
								avatar_id: { type: "string", description: "HeyGen avatar ID" },
								voice_id: { type: "string", description: "HeyGen voice ID" },
								input_text: { type: "string", description: "Text to convert to speech" },
								background: { type: "string", description: "Background color (optional)" }
							},
							required: ["avatar_id", "voice_id", "input_text"]
						}
					}
				]
			}), {
				headers: { "Content-Type": "application/json" }
			});
		}

		if (url.pathname === "/mcp/tools/call") {
			try {
				const body = await request.json() as any;
				
				if (!body.name) {
					return new Response(JSON.stringify({ error: "Tool name is required" }), {
						status: 400,
						headers: { "Content-Type": "application/json" }
					});
				}

				const toolName = body.name as string;
				const toolParams = body.arguments || {};
				
				// Simple tool routing based on tool name
				let result: any;
				
				switch (toolName) {
					case "add":
						if (typeof toolParams.a === "number" && typeof toolParams.b === "number") {
							result = { content: [{ type: "text", text: String(toolParams.a + toolParams.b) }] };
						} else {
							return new Response(JSON.stringify({ error: "Invalid parameters for add tool" }), {
								status: 400,
								headers: { "Content-Type": "application/json" }
							});
						}
						break;
						
					case "calculate":
						if (toolParams.operation && typeof toolParams.a === "number" && typeof toolParams.b === "number") {
							let calcResult: number = 0;
							switch (toolParams.operation) {
								case "add":
									calcResult = toolParams.a + toolParams.b;
									break;
								case "subtract":
									calcResult = toolParams.a - toolParams.b;
									break;
								case "multiply":
									calcResult = toolParams.a * toolParams.b;
									break;
								case "divide":
									if (toolParams.b === 0) {
										result = { content: [{ type: "text", text: "Error: Cannot divide by zero" }] };
									} else {
										calcResult = toolParams.a / toolParams.b;
									}
									break;
								default:
									return new Response(JSON.stringify({ error: "Invalid operation" }), {
										status: 400,
										headers: { "Content-Type": "application/json" }
									});
							}
							if (result === undefined) {
								result = { content: [{ type: "text", text: String(calcResult) }] };
							}
						} else {
							return new Response(JSON.stringify({ error: "Invalid parameters for calculate tool" }), {
								status: 400,
								headers: { "Content-Type": "application/json" }
							});
						}
						break;
						
					case "create_heygen_video":
						// Call the actual HeyGen API
						if (toolParams.avatar_id && toolParams.voice_id && toolParams.input_text) {
							const apiBody = {
								video_inputs: [
									{
										character: {
											type: "avatar",
											avatar_id: toolParams.avatar_id,
											avatar_style: "normal",
										},
										voice: {
											type: "text",
											input_text: toolParams.input_text,
											voice_id: toolParams.voice_id,
										},
										background: toolParams.background
											? { type: "color", value: toolParams.background }
											: undefined,
									},
								],
								dimension: {
									width: 1280,
									height: 720,
								},
							};
							
							try {
								const response = await fetch("https://api.heygen.com/v2/video/generate", {
									method: "POST",
									headers: {
										"X-Api-Key": (this.env as any).HEYGEN_API_KEY,
										"Content-Type": "application/json",
									},
									body: JSON.stringify(apiBody),
								});
								
								if (!response.ok) {
									const errorText = await response.text();
									result = {
										content: [
											{
												type: "text",
												text: `HeyGen API error: ${response.status} ${errorText}`,
											},
										],
									};
								} else {
									const data = await response.json() as { error?: any; data?: { video_id: string } };
									if (data.error) {
										result = {
											content: [
												{
													type: "text",
													text: `HeyGen API error: ${JSON.stringify(data.error as any)}`,
												},
											],
										};
									} else {
										result = {
											content: [
												{
													type: "text",
													text: `HeyGen video created! video_id: ${data.data?.video_id || 'unknown'}`,
												},
											],
										};
									}
								}
							} catch (err) {
								result = {
									content: [
										{
											type: "text",
											text: `Request failed: ${err instanceof Error ? err.message : String(err)}`,
										},
									],
								};
							}
						} else {
							return new Response(JSON.stringify({ error: "Missing required parameters for create_heygen_video tool" }), {
								status: 400,
								headers: { "Content-Type": "application/json" }
							});
						}
						break;
						
					default:
						return new Response(JSON.stringify({ error: `Tool '${toolName}' not found` }), {
							status: 404,
							headers: { "Content-Type": "application/json" }
						});
				}
				
				return new Response(JSON.stringify(result), {
					headers: { "Content-Type": "application/json" }
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: "Invalid JSON" }), {
					status: 400,
					headers: { "Content-Type": "application/json" }
				});
			}
		}

		return new Response("Not found", { status: 404 });
	}
}

export default {
	async fetch(request: Request, env: Env & { HEYGEN_API_KEY: string }, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message" || 
			url.pathname === "/mcp" || url.pathname === "/mcp/tools" || url.pathname === "/mcp/tools/call") {
			const id = env.MCP_OBJECT.idFromName("default");
			const obj = env.MCP_OBJECT.get(id);
			return obj.fetch(request);
		}

		return new Response("Not found", { status: 404 });
	},
};
