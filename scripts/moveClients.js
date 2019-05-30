registerPlugin({
	name: 'Move Clients',
	version: '1.0.1',
	description: 'Erlaubt es, andere Clients in den eigenen Channel zu verschieben ohne selbst Rechte zum Verschieben zu besitzen.',
	author: 'Fefe <fefe@life-of-german.org>',
	autorun: false,
	requireModules: ['engine', 'event', 'backend'],
	vars: {
		moveCommand: { title: 'Move-Befehl', type: 'string', placeholder: '.move' },
		factionChannel: { title: 'Fraktionskopf', type: 'channel' },
		watchedChannel: { title: 'Fraktionsanmeldung', type: 'channel' },
		requiredChannelGroups: { title: 'Gruppen-IDs (kommagetrennt)', type: 'string', placeholder: '14, 16, 18' },
		skipRequiredChannelGroups: { title: 'Mitglieder dieser Gruppen können nicht verschoben werden', type: 'checkbox' },
	}
}, function(_, config, meta) {
	const engine = require('engine');
	const event = require('event');
	const backend = require('backend');

	if (!config.moveCommand) {
		config.moveCommand = '.move';
	}

	if (!config.requiredChannelGroups) {
		config.requiredChannelGroups = '14,16,18';
	}

	config.requiredChannelGroups = config.requiredChannelGroups.replace(/\s/g, "");
	config.moveCommand = config.moveCommand.replace(/\s/g, "");

	const moveCommand = config.moveCommand;
	const factionChannel = backend.getChannelByID(config.factionChannel);
	const watchedChannel = backend.getChannelByID(config.watchedChannel);
	const requiredChannelGroups = config.requiredChannelGroups.split(',');
	const skipRequiredChannelGroups = config.skipRequiredChannelGroups;

	event.on('chat', function(ev) {
		if (ev.text === moveCommand || isFinite(ev.text)) {
			var clientName = ev.client.name();
			var clientChannel = ev.client.getChannels()[0];
			var clientChannelGroup = ev.client.getChannelGroup();

			if (clientChannel.parent() === undefined || clientChannelGroup === undefined) {
				engine.log('[' + clientName + '] Es konnte kein übergeordneter Channel gefunden werden.');
				return false;
			}

			if (clientChannel.parent().id() !== factionChannel.id()) {
				engine.log('[' + clientName + '] Dieser Befehl ist nur innerhalb dieses Channels erlaubt: ' + factionChannel.name());
				return false;
			}

			if (requiredChannelGroups.indexOf(clientChannelGroup.id()) < 0) {
				engine.log('[' + clientName + '] Die Gruppen-ID ' + clientChannelGroup.id() + ' ist nicht für diesen Befehl freigeschalten.');
				return false;
			}

			if (ev.text === moveCommand) {
				var clients = backend.getClients();
				var clientCount = 0;

				clients.forEach(function(client) {
					if (client.getChannels()[0].id() !== watchedChannel.id()) {
						return;
					}

					if (client.isSelf() || client.id() === ev.client.id()) {
						return;
					}

					ev.client.chat('[' + client.id() + '] [URL=client://' + client.id() + '/' + client.uniqueID() + '~]' + client.name() + '[/URL]');
					clientCount += 1;
				});

				if (!clientCount) {
					ev.client.chat('In "' + watchedChannel.name() + '" befindet sich kein Client, der verschoben werden könnte.');
				}
			} else if (isFinite(ev.text)) {
				var targetClient = backend.getClientByID(ev.text);

				if (targetClient === undefined) {
					engine.log('[' + clientName + '] Der angegebenen ID konnte kein Client zugewiesen werden.');
					return false;
				}

				var targetClientChannelGroup = targetClient.getChannelGroup();

				if (skipRequiredChannelGroups && requiredChannelGroups.indexOf(targetClientChannelGroup.id()) >= 0) {
					engine.log('[' + clientName + '] Gruppenmitglieder können mit den aktuellen Einstellungen nicht verschoben werden.');
					return false;
				}

				var targetClientChannel = targetClient.getChannels()[0];

				if (targetClientChannel.id() !== watchedChannel.id()) {
					engine.log('[' + clientName + '] Der ausgewählte Client befindet sich nicht im erwarteten Channel: ' + watchedChannel.name());
					return false;
				}

				if (targetClientChannel.id() === clientChannel.id()) {
					engine.log('[' + clientName + '] Der ausgewählte Client darf nicht der ausführende Client sein.');
					return false;
				}

				targetClient.moveTo(clientChannel);
			}
		}
	});
});
