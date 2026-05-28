import type { FocusNfeEnvironment } from "@kyra/shared";

const BASE_URLS: Record<FocusNfeEnvironment, string> = {
	sandbox: "https://homologacao.focusnfe.com.br",
	production: "https://api.focusnfe.com.br",
};

export interface FocusNfeConfig {
	token: string;
	environment: FocusNfeEnvironment;
}

export interface IssueNfsePayload {
	reference: string;
	prestadorCnpj: string;
	prestadorInscricaoMunicipal: string | null;
	tomadorCnpjCpf: string | null;
	tomadorRazaoSocial: string;
	tomadorEmail?: string | null;
	tomadorEndereco: {
		logradouro?: string | null;
		numero?: string | null;
		complemento?: string | null;
		bairro?: string | null;
		codigoMunicipio?: string | null;
		uf?: string | null;
		cep?: string | null;
	};
	servico: {
		aliquota: number;
		discriminacao: string;
		itemListaServico: string | null;
		codigoTributarioMunicipio: string | null;
		valorServicos: number;
	};
}

export interface FocusNfeResponse {
	status?: string;
	ref?: string;
	cnpj_prestador?: string;
	numero?: string;
	codigo_verificacao?: string;
	data_emissao?: string;
	url?: string;
	caminho_xml_nota_fiscal?: string;
	url_danfse?: string;
	mensagem_sefaz?: string;
	erros?: { codigo?: string; mensagem?: string }[];
	[key: string]: unknown;
}

function authHeader(token: string): string {
	return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

function digitsOnly(value: string): string {
	return value.replace(/\D/g, "");
}

function buildIssueBody(payload: IssueNfsePayload): Record<string, unknown> {
	return {
		data_emissao: new Date().toISOString(),
		prestador: {
			cnpj: digitsOnly(payload.prestadorCnpj),
			inscricao_municipal: payload.prestadorInscricaoMunicipal
				? digitsOnly(payload.prestadorInscricaoMunicipal)
				: undefined,
		},
		tomador: {
			cnpj: payload.tomadorCnpjCpf ? digitsOnly(payload.tomadorCnpjCpf) : undefined,
			razao_social: payload.tomadorRazaoSocial,
			email: payload.tomadorEmail || undefined,
			endereco: {
				logradouro: payload.tomadorEndereco.logradouro || undefined,
				numero: payload.tomadorEndereco.numero || undefined,
				complemento: payload.tomadorEndereco.complemento || undefined,
				bairro: payload.tomadorEndereco.bairro || undefined,
				codigo_municipio: payload.tomadorEndereco.codigoMunicipio || undefined,
				uf: payload.tomadorEndereco.uf || undefined,
				cep: payload.tomadorEndereco.cep ? digitsOnly(payload.tomadorEndereco.cep) : undefined,
			},
		},
		servico: {
			aliquota: payload.servico.aliquota,
			discriminacao: payload.servico.discriminacao,
			iss_retido: "false",
			item_lista_servico: payload.servico.itemListaServico || undefined,
			codigo_tributario_municipio: payload.servico.codigoTributarioMunicipio || undefined,
			valor_servicos: payload.servico.valorServicos,
		},
	};
}

export class FocusNfeError extends Error {
	status: number;
	body: unknown;
	constructor(message: string, status: number, body: unknown) {
		super(message);
		this.status = status;
		this.body = body;
	}
}

export const focusNfe = {
	async issue(config: FocusNfeConfig, payload: IssueNfsePayload): Promise<FocusNfeResponse> {
		const url = `${BASE_URLS[config.environment]}/v2/nfse?ref=${encodeURIComponent(payload.reference)}`;
		const res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: authHeader(config.token),
				"Content-Type": "application/json",
			},
			body: JSON.stringify(buildIssueBody(payload)),
		});

		const body = (await res.json().catch(() => ({}))) as FocusNfeResponse;

		if (!res.ok) {
			const message =
				body.erros?.[0]?.mensagem ||
				body.mensagem_sefaz ||
				`Focus NFe request failed (${res.status})`;
			throw new FocusNfeError(message, res.status, body);
		}

		return body;
	},

	async getByReference(config: FocusNfeConfig, reference: string): Promise<FocusNfeResponse> {
		const url = `${BASE_URLS[config.environment]}/v2/nfse/${encodeURIComponent(reference)}`;
		const res = await fetch(url, {
			headers: { Authorization: authHeader(config.token) },
		});
		const body = (await res.json().catch(() => ({}))) as FocusNfeResponse;
		if (!res.ok) {
			throw new FocusNfeError(
				`Focus NFe lookup failed (${res.status})`,
				res.status,
				body,
			);
		}
		return body;
	},

	async cancel(
		config: FocusNfeConfig,
		reference: string,
		justification: string,
	): Promise<FocusNfeResponse> {
		const url = `${BASE_URLS[config.environment]}/v2/nfse/${encodeURIComponent(reference)}`;
		const res = await fetch(url, {
			method: "DELETE",
			headers: {
				Authorization: authHeader(config.token),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ justificativa: justification }),
		});
		const body = (await res.json().catch(() => ({}))) as FocusNfeResponse;
		if (!res.ok) {
			const message =
				body.erros?.[0]?.mensagem ||
				body.mensagem_sefaz ||
				`Focus NFe cancel failed (${res.status})`;
			throw new FocusNfeError(message, res.status, body);
		}
		return body;
	},

	mapStatus(focusStatus: string | undefined): "processing" | "authorized" | "error" | "cancelled" {
		switch (focusStatus) {
			case "autorizado":
				return "authorized";
			case "cancelado":
				return "cancelled";
			case "erro_autorizacao":
			case "erro":
				return "error";
			default:
				return "processing";
		}
	},
};
