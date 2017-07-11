const Plugin = module.parent.require('../Structures/Plugin');
const $ = require("jquery");

var isQuote = false,
	quoting = false,
	elem,
	chanName,
	serverName,
	atServerName,
	stringLocal;

class Citador extends Plugin {
	constructor(...args) {
		super(...args);
		this.closeImg = "https://discordapp.com/assets/14f734d6803726c94b970c3ed80c0864.svg";
		this.deleteMsgBtnImg = "https://imgh.us/deleteMsgBtnImgHover.svg";
		this.componentToHex = (c) => {
			var hex = Number(c).toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		};
		this.rgbToHex = (r, g, b) => {
			return this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
		};
		this.cancelQuote = () => {
			$('.quote-msg').slideUp(150, () => { $('.quote-msg').remove() });
			$('.tooltip.citador').remove();
			isQuote      = false; 
			quoting      = false;
			atServerName = '';
		};
		this.getInternalInstance = e => e[Object.keys(e).find(k => k.startsWith("__reactInternalInstance"))];
		this.getOwnerInstance = (e, {include, exclude=["Popout", "Tooltip", "Scroller", "BackgroundFlash"]} = {}) => {
			if (e === undefined) {
				return undefined;
			}
			const excluding = include === undefined;
			const filter = excluding ? exclude : include;
			function getDisplayName(owner) {
				const type = owner._currentElement.type;
				const constructor = owner._instance && owner._instance.constructor;
				return type.displayName || constructor && constructor.displayName || null;
			}
			function classFilter(owner) {
				const name = getDisplayName(owner);
				return (name !== null && !!(filter.includes(name) ^ excluding));
			}

			for (let prev, curr = this.getInternalInstance(e); !_.isNil(curr); prev = curr, curr = curr._hostParent) {
				if (prev !== undefined && !_.isNil(curr._renderedChildren)) {
					let owner = Object.values(curr._renderedChildren)
						.find(v => !_.isNil(v._instance) && v.getHostNode() === prev.getHostNode());
					if (!_.isNil(owner) && classFilter(owner)) {
						return owner._instance;
					}
				}

				if (_.isNil(curr._currentElement)) {
					continue;
				}
				let owner = curr._currentElement._owner;
				if (!_.isNil(owner) && classFilter(owner)) {
					return owner._instance;
				}
			}

			return null;
		};
		switch(navigator.language) {
			case 'pt-BR':
				stringLocal = {
					startMsg: "Iniciado",
					quoteTooltip: "Citar",
					deleteTooltip: "Excluir",
					noPermTooltip: "Sem permissão para citar",
					attachment: "Anexo"
				};
				break;
			case 'en-US':
				stringLocal = {
					startMsg: "Started",
					quoteTooltip: "Quote",
					deleteTooltip: "Delete",
					noPermTooltip: "No permission to quote",
					attachment: "Attachment"
				};
				break;
			case 'ru-RU':
				stringLocal = {
					startMsg: "Начало",
					quoteTooltip: "Цитата",
					deleteTooltip: "Удалить",
					noPermTooltip: "Нет прав для цитирования",
					attachment: "Вложение"
				};
				break;
			default:
				stringLocal = {
					startMsg: "Started",
					quoteTooltip: "Quote",
					deleteTooltip: "Delete",
					noPermTooltip: "No permission to quote",
					attachment: "Attachment"
				};
				break;
		}
		var self = this;
		$(document).on("mouseover.citador", function(e) {
			var target = $(e.target);
			if (target.parents(".message").length > 0) {
				var todasMensagens = $('.messages .message-group'),
					nomeData       = $('.messages .message-group .comment .body h2'),
					citarBtn       = '<span class="citar-btn"></span>',
					closeBtn       = '<div class="quote-close"></div>',
					deleteMsgBtn   = '<div class="delete-msg-btn"></div>',
					quoteTooltip   = $("<div>").append(stringLocal.quoteTooltip).addClass("tooltip tooltip-top tooltip-normal citador"),
					deleteTooltip  = $("<div>").append(stringLocal.deleteTooltip).addClass("tooltip tooltip-top tooltip-normal citador"),
					noPermTooltip  = $("<div>").append(stringLocal.noPermTooltip).addClass("tooltip tooltip-top tooltip-error citador");
				
				todasMensagens
				.on('mouseover', function() {
					if ($(this).find('.citar-btn').length == 0) {
						todasMensagens.hasClass('compact') ? $(this).find('.timestamp').first().prepend(citarBtn) : $(this).find(nomeData).append(citarBtn);
						$(this).find('.citar-btn')
							.on('mousedown.citador', function() {return false;})
							.on('mouseover.citador', function() {
								$(".tooltips").append(quoteTooltip);
								var position = $(this).offset();
								position.top -= 50;
								position.left += $(this).width()/2 - quoteTooltip.width()/2 - 11;
								quoteTooltip.offset(position);
								$(this).on("mouseout.citador", function () {
									$(this).off("mouseout.citador");
									quoteTooltip.remove();
								});
							})
							.click(function() {
								self.log("Quoting a message");
								self.attachParser();
								isQuote      = true;
								atServerName = '';
								
								var message  = $(this).parents('.message-group'),
									text,
									range;
									
								if (window.getSelection && window.getSelection().rangeCount > 0) {
									range = window.getSelection().getRangeAt(0);
								} else if (document.selection && document.selection.type !== 'Control') {
									range = document.selection.createRange();
								}
								var thisPost = $(this).closest('.comment');
								
								this.createQuote = function() {
									$(message).clone().hide().appendTo(".quote-msg").slideDown(150);
									serverName = $('.header-1tSljs .name-3gtcmp').text();
									elem = $('.quote-msg');
									
									$('.quote-msg').find('.citar-btn').toggleClass('quoting');
									$('.quote-msg').find('.citar-btn').text('');
									
									$('.quote-msg').find('.embed').each(function() {
										$(this).closest('.accessory').remove();
									});
									
									$('.quote-msg').find('.markup').each(function() {
										if ($(this).text() == "" && $(this).closest(".message").find('.accessory').length == 0) {
											$(this).closest('.message-text').remove();
										}
									});
									$('.quote-msg').find('.message-content').each(function() {
										if ($(this).text() == "" && $(this).closest(".message").find('.accessory').length == 0) {
											$(this).closest('.message-text').remove();
										}
									});

									// testar se é um canal privado ou canal de servidor ou grupo privado
									chanName = $('.chat .title-wrap .channel-name').text();
									if ($('.chat .title-wrap .title:not(.channel-group-dm) .channel-name.channel-private').length >= 1) { 
										chanName = "@" + chanName
									}
									if ($('.chat .title-wrap .title:not(.channel-group-dm) .channel-name:not(.channel-private)').length >= 1) {
										chanName = "#" + chanName
									}

									$('.quote-msg').find('.markup').before(deleteMsgBtn);
									$('.quote-msg').find('.edited, .btn-option, .btn-reaction').remove();
									
									$('.quote-msg .message-group').append(closeBtn);
									$('.quote-msg').find('.quote-close').click(function() {
										self.cancelQuote();
									});
									
									// define a função de clique, pra deletar uma mensagem que você não deseja citar
									$('.quote-msg').find('.delete-msg-btn')
										.click(function() {
											$('.quote-msg').find('.message').has(this).find('.message-text, .accessory').remove();
											deleteTooltip.remove();
											if ($('.quote-msg').find('.message-text').length == 0) {
												self.cancelQuote();
											}
										})
										.on('mouseover.citador', function() {
											$(".tooltips").append(deleteTooltip);
											var position = $(this).offset();
											position.top -= 50;
											position.left += $(this).width()/2 - deleteTooltip.width()/2 - 11;
											deleteTooltip.offset(position);
											$(this).on("mouseout.citador", function () {
												$(this).off("mouseout.citador");
												deleteTooltip.remove();
											});
										});
									
									$('.content .channel-textarea textarea').focus();

									if (range) {
										var startPost = $(range.startContainer).closest('.comment'),
											endPost   = $(range.endContainer).closest('.comment');
											
										if (startPost.is(endPost) && startPost.is(thisPost) && startPost.length && endPost.length) {
											text = range.toString().trim();
											$('.quote-msg').find(".markup, .accessory, .message:not(.first)").remove();
											$('.quote-msg').find(".message.first").find(".message-text").append('<div class="markup">' + text + '</div>');
										}
									}

									$('.quote-msg').find(".message")
										.on('mouseover.citador', function() {
											$(this).find('.delete-msg-btn').fadeTo(5, 0.4);
										})
										.on('mouseout.citador', function() {
											$(this).find('.delete-msg-btn').fadeTo(5, 0);
										});

									var elemento = document.querySelector(".messages"),
										channel = self.getOwnerInstance(elemento, {include:["Channel"]}),
										canEmbed = channel.state.channel.isPrivate() || channel.can(0x4800, {channelId: channel.state.channel.id});
									
									if (canEmbed == false) {
										$('.quote-msg').find('.citar-btn:not(.quoting).cant-embed').toggleClass('quoting', 'cant-embed');
										$('.quote-msg').find('.citar-btn:not(.cant-embed)').toggleClass('cant-embed');
										$('.quote-msg').find('.citar-btn').text("");
										$('.quote-msg').find('.citar-btn')
											.on('mouseover.citador', function() {
												if ($(this).hasClass('cant-embed')) {
													$(".tooltips").append(noPermTooltip);
													var position = $(this).offset();
													position.top -= 50;
													position.left += $(this).width()/2 - noPermTooltip.width()/2 - 10;
													noPermTooltip.offset(position);
													$(this).on("mouseout.citador", function () {
														$(this).off("mouseout.citador");
														noPermTooltip.remove();
													});
												}
											});
									}
								};
								
								if (quoting == true) {
									$('.quote-msg').find('.message-group').remove();
									this.createQuote();
								}
								
								if (quoting == false) {
									$('.channel-text-area-default').prepend('<div class="quote-msg"></div>');
									quoting = true;
									this.createQuote();
								}
							});
					}
				})
				.on('mouseleave',function() {
					if ($(this).find('.citar-btn').length == 1) {
						$(this).find('.citar-btn').empty().remove();
					}
				});
			}
		});
		this.log(stringLocal.startMsg, "info");
        window.DI.client.on('selectedUpdate', this.onSwitch.bind(this));
        window.DI.client.once('ready', this.onSwitch.bind(this));
	}
	attachParser() {
		var el   = $('.textAreaEnabled-2vOfh8'),
			self = this;
			
		if (el.length == 0) return;
		
		this.handleKeypress = function(e) {
			var code = e.keyCode || e.which;
			if (code !== 13) return;
			try {
				if (isQuote == true) {
					if (e.shiftKey || $('.channel-textarea-autocomplete-inner').length >= 1) return;
					
					var color     = $('.quote-msg').find('.user-name').first().css('color'),
						user      = $('.quote-msg').find('.user-name').first().text(),
						avatarUrl = $('.quote-msg').find('.avatar-large').css('background-image') ? $('.quote-msg').find('.avatar-large').css('background-image').replace(/.*\s?url\([\'\"]?/, '').replace(/[\'\"]?\).*/, '') : '',
						oldText   = $('.content .channel-textarea textarea').val(),
						hourpost  = $('.quote-msg').find('.timestamp').text(),
						quoteMsg  = $('.quote-msg').find('.comment'),
						text      = '';
					
					// trocar todas as edições do markup pra texto
					quoteMsg.find(  'pre'  ).each(function() {$(this).html(`${$(this).find('code').attr('class').split(' ')[1] || ""}\n${$(this).find('code').text()}`)});
					quoteMsg.find('.markup').each(function() {
						$(this).html($(this).html().replace(/<\/?code( class="inline")?>/g, "`"));
						$(this).html($(this).html().replace(/<\/?pre>/g, "```"));
						$(this).html($(this).html().replace(/<\/?strong>/g, "**"));
						$(this).html($(this).html().replace(/<\/?em>/g, "*"));
						$(this).html($(this).html().replace(/<\/?s>/g, "~~"));
						$(this).html($(this).html().replace(/<\/?u>/g, "__"));
					});
					
					// trocar os emotes por texto
					quoteMsg.find('.emotewrapper').each(function() {$(this).html($(this).find('img').attr('alt'));});
					quoteMsg.find(    '.emoji'   ).each(function() {
						if ($(this).attr('src').includes('assets/')) {
							$(this).html($(this).attr('alt'));
						}
						if ($(this).attr('src').includes('emojis/')) {
							$(this).html(`<${$(this).attr('alt')}${$(this).attr('src').split('/').pop().replace('.png', '')}>`);
						}
					});
					
					// definir texto pra citar
					$('.messages .message-group').hasClass('compact') ? quoteMsg.find('.message-content').each(function() {text += `${$(this).clone().end().text()}\n`;}) : quoteMsg.find('.markup').each(function() {text += `${$(this).clone().end().text()}\n`;});
					
					// converte a cor do cargo pra hex 
					color = color.split(/rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/);
					color = Number('0x' + self.rgbToHex(color[1], color[2], color[3]).toString());

					if ($('.messages .message-group').hasClass('compact')) {
						$('.quote-msg').find('.timestamp').first().find('i, .citar-btn').remove();
						hourpost = $('.quote-msg').find('.timestamp').first().text();
					}
					
					// os dados do embed 
					var data = {
							content: oldText,
							embed: {
								author: {
									name: user,
									icon_url: avatarUrl
								},
								description: text,
								footer: {
									text: `in ${chanName}${atServerName} - ${hourpost}`
								},
								image: {url: ''},
								fields: [],
								color: color
							}
						},
						chanID = window.location.pathname.split('/').pop();

					// checar se tem alguma imagem na mensagem citada, e adicionar ao embed final
					if ($('.quote-msg').find('.attachment-image').length >= 1) {
						data.embed.image.url = $('.quote-msg').find('.attachment-image a').attr('href');
					}
					
					// checar se tem algum arquivo na mensagem citada, e adicionar ao embed final
					if ($('.quote-msg').find('.attachment').length >= 1) {
						for (var i = 0; i < $('.quote-msg').find('.attachment').length; i++) {
							var value     = $($('.quote-msg').find('.attachment')[i]).find('.attachment-inner a').text(),
								link      = $($('.quote-msg').find('.attachment')[i]).find('.attachment-inner a').attr('href'),
								attachNum = i + 1,
								emoji     = '📁';
							if (/(.apk|.appx|.pkg|.deb)$/.test(value)) {emoji = '📦'}
							if (/(.jpg|.png|.gif)$/.test(value)) {emoji = '🖼'}
							if (/(.zip|.rar|.tar.gz)$/.test(value)) {emoji = '📚'}
							if (/(.txt)$/.test(value)) {emoji = '📄'}
							data.embed.fields.push({name: `${stringLocal.attachment} #${attachNum}`, value: `${emoji} [${value}](${link})`});
						}
					}
					
					// post do quote final
					$.ajax({
						type : "POST",
						url : `https://discordapp.com/api/channels/${chanID}/messages`,
						headers : {
							"Authorization": window.DI.client.token
						},
						dataType : "json",
						contentType : "application/json",
						data: JSON.stringify(data),
						error: (req) => {
							self.log(req.responseText, "error");
						}
					});
					$(this).val("").focus()[0].dispatchEvent(new Event('input', { bubbles: true }));
					
					self.cancelQuote();
					e.preventDefault();
					e.stopPropagation();
					return;
				}
			} 
			catch (e) {
				self.log(e, "warn");
			}
		};
		el[0].addEventListener("keydown", this.handleKeypress, false);
		el[0].addEventListener("keyup", function(e) {
			if (e.keyCode == 27 && isQuote == true) {
				self.cancelQuote();
			}
		}, false);
	}
	deleteEverything() {
		$(document).off("mouseover.citador");
		$('.messages .message-group').off('mouseover');
		$('.messages .message-group').off('mouseleave');
		$("#CSS-Citador").remove();
	}
	unload() {
		this.deleteEverything();
        window.DI.client.removeListener('selectedUpdate', this.onSwitch.bind(this));
	}
	onSwitch() {
		this.attachParser();
		if (isQuote == true) {
			var elemento      = document.querySelector(".messages"),
				channel       = this.getOwnerInstance(elemento, {include:["Channel"]}),
				canEmbed      = channel.state.channel.isPrivate() || channel.can(0x4800, {channelId: channel.state.channel.id}),
				noPermTooltip = $("<div>").append(stringLocal.noPermTooltip).addClass("tooltip tooltip-top tooltip-error citador");
			
			if (canEmbed == false) {
				$('.quote-msg').find('.citar-btn:not(.quoting).cant-embed').toggleClass('quoting', 'cant-embed');
				$('.quote-msg').find('.citar-btn:not(.cant-embed)').toggleClass('cant-embed');
				$('.quote-msg').find('.citar-btn').text("");
				$('.quote-msg').find('.citar-btn')
					.on('mouseover.citador', function() {
						if ($(this).hasClass('cant-embed')) {
							$(".tooltips").append(noPermTooltip);
							var position = $(this).offset();
							position.top -= 60;
							position.left += $(this).width()/2 - noPermTooltip.width()/2 - 5;
							noPermTooltip.offset(position);
							$(this).on("mouseout.citador", function () {
								$(this).off("mouseout.citador");
								noPermTooltip.remove();
							});
						}
					});
			} else {
				$('.quote-msg').find('.citar-btn:not(.quoting)').toggleClass('quoting');
				$('.quote-msg').find('.citar-btn.cant-embed').toggleClass('cant-embed');
				$('.quote-msg').find('.citar-btn').text("");
			}
			if (serverName !== $('.guild-header header span').text() && serverName !== "") {
				atServerName = " at " + serverName;
			} else if (serverName == $('.guild-header header span').text() || serverName == ""){
				atServerName = '';
			}
			$('.channel-textarea').prepend(elem);
		}
	}
}

module.exports = Citador;