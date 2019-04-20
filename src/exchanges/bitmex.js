import Exchange from '../services/exchange'

class Bitmex extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'bitmex';

		this.endpoints = {
			PRODUCTS: 'https://www.bitmex.com/api/v1/instrument/active',
			TRADES: () => `https://www.bitmex.com/api/v1/trade?symbol=${this.pair}&reverse=true&count=500`
		}

		this.options = Object.assign({
			url: () => {
				return `wss://www.bitmex.com/realtime?subscribe=trade:${this.pair},liquidation:${this.pair}`
			},
		}, this.options);
	}

	connect() {
		if (!super.connect())
			return;

		this.api = new WebSocket(this.getUrl());

		this.api.onmessage = event => this.emitTrades(this.formatLiveTrades(JSON.parse(event.data)));
		this.api.onopen = this.emitOpen.bind(this);
		this.api.onclose = this.emitClose.bind(this);
		this.api.onerror = this.emitError.bind(this, {message: 'Websocket error'});
	}

	disconnect() {
		if (!super.disconnect())
			return;

		if (this.api && this.api.readyState < 2) {
			this.api.close();
		}
	}

	formatLiveTrades(json) {
		if (json && json.data && json.data.length) {
			if (json.table === 'liquidation' && json.action === 'insert') {
				return json.data.map(trade => [
					this.id,
					+new Date(),
					trade.price,
					trade.leavesQty / trade.price,
					trade.side === 'Buy' ? 1 : 0,
					1
				]);
			} else if (json.table === 'trade' && json.action === 'insert') {
				return json.data.map(trade => [
					this.id,
					+new Date(trade.timestamp),
					trade.price,
					trade.size / trade.price,
					trade.side === 'Buy' ? 1 : 0
				]);
			}
		}

		return false;
	}

	/* formatRecentsTrades(response) {
		if (response && response.length) {
			return response.reverse().map(trade => [
				this.id,
				+new Date(trade.timestamp),
				trade.price,
				trade.size / trade.price,
				trade.side === 'Buy' ? 1 : 0
			])
		}
	} */

	formatProducts(data) {
		return data.map(a => a.symbol);
	}

	matchPairName(name) {
		if (this.pairs.indexOf(name) !== -1) {
			return name;
		}
		let nameXbt = name.replace('BTC', 'XBT')
		if (this.pairs.indexOf(nameXbt) !== -1) {
			return nameXbt;
		}
		let nameM19 = name.replace('BTC', 'M19')
		if (this.pairs.indexOf(nameM19) !== -1) {
			return nameM19;
		}
		
		return false;	
	}

}

export default Bitmex;